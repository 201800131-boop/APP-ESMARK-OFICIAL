const { spawn, spawnSync } = require('child_process');
const path = require('path');

// Asegurar que Electron no se ejecute en modo "run as node"
if (process.env.ELECTRON_RUN_AS_NODE) {
  console.warn('ELECTRON_RUN_AS_NODE estaba activo; se elimina para iniciar la app.');
}
delete process.env.ELECTRON_RUN_AS_NODE;

const env = { ...process.env, NODE_ENV: 'development' };
delete env.ELECTRON_RUN_AS_NODE;

const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
const waitOnCmd = path.join(binDir, process.platform === 'win32' ? 'wait-on.cmd' : 'wait-on');
const tscCmd = path.join(binDir, process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

function runSync(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', env, shell: true });
  if (result.status !== 0) {
    const code = result.status ?? 'desconocido';
    const reason = result.error ? ` (${result.error.message})` : '';
    console.error(`Comando fallo con codigo ${code}: ${cmd}${reason}`);
    process.exit(result.status ?? 1);
  }
}

console.log('Esperando a que Vite exponga http://localhost:5173 ...');
runSync(waitOnCmd, ['http://localhost:5173', '--timeout', '30000']);
console.log('Compilando proceso principal de Electron...');
runSync(tscCmd, ['-p', 'src/tsconfig.electron.json']);

console.log('Lanzando Electron...');
const electronCli = path.join(__dirname, '..', 'node_modules', 'electron', 'cli.js');
const child = spawn(process.execPath, [electronCli, '.'], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
