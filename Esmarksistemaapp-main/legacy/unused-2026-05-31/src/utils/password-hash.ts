/**
 * Utilidad de hash de contraseñas usando Web Crypto API (SHA-256)
 * Disponible en todos los navegadores modernos y Electron.
 * 
 * Las contraseñas NUNCA se almacenan en texto plano. 
 * Se usa el prefijo "sha256:" para distinguir hashes de texto plano durante la migración.
 */

const HASH_PREFIX = 'sha256:';

/**
 * Genera un hash SHA-256 de la contraseña (async, usa WebCrypto)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${HASH_PREFIX}${hashHex}`;
}

/**
 * Compara una contraseña en texto plano con un hash almacenado.
 * Si el hash almacenado no tiene el prefijo, compara directamente 
 * (compatibilidad con datos legacy durante la migración).
 */
export async function verifyPassword(
  plainPassword: string,
  storedPassword: string
): Promise<boolean> {
  if (!storedPassword) return false;

  // Si el almacenado es un hash SHA-256, comparar con hash
  if (storedPassword.startsWith(HASH_PREFIX)) {
    const hashed = await hashPassword(plainPassword);
    return hashed === storedPassword;
  }

  // Compatibilidad legacy: contraseña en texto plano (migración pendiente)
  // Comparar directamente pero señalar que necesita migración
  return plainPassword === storedPassword;
}

/**
 * Indica si una contraseña almacenada ya está hasheada
 */
export function isHashed(storedPassword: string): boolean {
  return storedPassword?.startsWith(HASH_PREFIX) ?? false;
}

/**
 * Hashes pre-calculados de las contraseñas por defecto del sistema.
 * Se calcularon con: echo -n "<password>" | shasum -a 256
 */
export const DEFAULT_PASSWORD_HASHES: Record<string, string> = {
  admin:       `${HASH_PREFIX}240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`,
  maria_esmark:`${HASH_PREFIX}626e3c805e77eeb472c42c6be607be2af7ac5c08fd7050f278e0330fe81abf57`,
  july_esmark: `${HASH_PREFIX}def94c99a174eb6af37abb7a4196f6acea9c0ac26021182d3d8a70dc212b4330`,
  meli_esmark: `${HASH_PREFIX}59d8bfba8be3c5492980b4a47b4d30004f1e9d85682af81d3f4288ec719bb094`,
};
