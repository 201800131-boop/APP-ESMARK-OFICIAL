Param(
    [string]$EnvPath = ".env"
)

if (-not (Test-Path $EnvPath)) {
    Write-Host "No se encontro $EnvPath. Crea una copia de .env.example con tus claves de Supabase primero." -ForegroundColor Yellow
} else {
    Get-Content $EnvPath | ForEach-Object {
        if ($_ -match '^\s*([^#\s=]+)\s*=\s*(.+)$') {
            $key = $matches[1]
            $value = $matches[2].Trim('"')
            Set-Item -Force "env:$key" $value
        }
    }
    Write-Host "Variables cargadas desde $EnvPath" -ForegroundColor Green
}

Write-Host "Arrancando Vite..." -ForegroundColor Cyan
$npm = (Get-Command npm -ErrorAction SilentlyContinue).Source
if (-not $npm) {
    Write-Host "npm no encontrado en PATH. Abre una nueva terminal y verifica la instalacion de Node.js." -ForegroundColor Red
    exit 1
}
$dev = Start-Process -FilePath $npm -ArgumentList "run","dev" -NoNewWindow -PassThru
Start-Sleep -Seconds 3
Write-Host "Electron se inicia desde 'npm run dev' (concurrently)." -ForegroundColor Cyan

Write-Host "Esperando a que cierres la terminal para terminar procesos..." -ForegroundColor Green
if ($dev) {
    $dev.WaitForExit()
}
