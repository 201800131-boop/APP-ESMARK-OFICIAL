/**
 * Informacion de Supabase.
 *
 * Se lee desde las variables de entorno configuradas en .env.local.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const projectId = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1] || '';
export const publicAnonKey = supabaseAnonKey;

if (!projectId) {
  console.warn('VITE_SUPABASE_URL no esta configurado o es invalido');
}

if (!publicAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY no esta configurado');
}

export const isSupabaseConfigured = () => Boolean(projectId && publicAnonKey);
