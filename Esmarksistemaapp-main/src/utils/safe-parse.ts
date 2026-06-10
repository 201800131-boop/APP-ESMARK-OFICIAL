// Utilidad para parsear JSON desde localStorage de forma segura
export function safeParse(input: string | null, fallback: any = null) {
  if (!input) return fallback;
  try {
    return JSON.parse(input);
  } catch (err) {
    console.warn('safeParse: JSON malformado, usando fallback', err);
    return fallback;
  }
}
