// Archivo de override para deshabilitar validación de TLDs en PWA
// Este archivo se carga antes que cualquier validador de URLs problemático

if (typeof globalThis !== 'undefined') {
  // Crear un proxy alrededor de URL para manejar errores de TLD gracefully
  const OriginalURL = globalThis.URL;
  
  if (OriginalURL) {
    globalThis.URL = function(...args) {
      try {
        return new OriginalURL(...args);
      } catch (err) {
        if (err.message && err.message.includes('TLD')) {
          // Silenciar errores de TLD
          console.debug('TLD validation error suppressed:', err.message);
          // Retornar un objeto URL simulado
          return {
            href: args[0],
            toString: () => args[0],
            valueOf: () => args[0]
          };
        }
        throw err;
      }
    };
    
    // Copiar métodos estáticos
    for (let key in OriginalURL) {
      if (typeof OriginalURL[key] === 'function') {
        globalThis.URL[key] = OriginalURL[key].bind(OriginalURL);
      }
    }
  }
}
