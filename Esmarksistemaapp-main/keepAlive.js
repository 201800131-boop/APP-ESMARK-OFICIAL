const fs = require('fs');
const path = require('path');

function loadEnvFiles() {
  const candidates = ['.env', '.env.local'];

  for (const fileName of candidates) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;

      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim();

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const DEFAULT_TABLE = process.env.KEEPALIVE_TABLE || 'users';
const DEFAULT_CRON_EXPR = process.env.KEEPALIVE_CRON_EXPR || '0 3 */2 * *';

async function buildClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_ANON_KEY');
  }

  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function runKeepAlive() {
  const startedAt = new Date().toISOString();

  try {
    const supabase = await buildClient();

    const { data, error } = await supabase
      .from(DEFAULT_TABLE)
      .select('id')
      .limit(1);

    if (error) {
      console.error(`[keepAlive] ${startedAt} - Error consultando Supabase:`, error.message || error);
      return { ok: false, error: error.message || String(error) };
    }

    console.log(
      `[keepAlive] ${startedAt} - OK. Tabla: ${DEFAULT_TABLE}. Registros devueltos: ${Array.isArray(data) ? data.length : 0}`
    );

    return { ok: true, rows: Array.isArray(data) ? data.length : 0 };
  } catch (err) {
    console.error(`[keepAlive] ${startedAt} - Error general:`, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

async function startCronMode() {
  try {
    const cronModule = await import('node-cron');
    const cron = cronModule.default || cronModule;

    if (!cron.validate(DEFAULT_CRON_EXPR)) {
      throw new Error(`Expresion cron invalida: ${DEFAULT_CRON_EXPR}`);
    }

    console.log(`[keepAlive] Modo cron local activo. Expresion: ${DEFAULT_CRON_EXPR}`);
    await runKeepAlive();

    cron.schedule(DEFAULT_CRON_EXPR, async () => {
      await runKeepAlive();
    });
  } catch (err) {
    console.error('[keepAlive] No se pudo iniciar node-cron:', err?.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  const cronMode = process.argv.includes('--cron') || process.env.KEEPALIVE_LOCAL_CRON === 'true';

  if (cronMode) {
    startCronMode();
  } else {
    runKeepAlive().then((result) => {
      if (!result.ok) process.exitCode = 1;
    });
  }
}

module.exports = {
  runKeepAlive,
};
