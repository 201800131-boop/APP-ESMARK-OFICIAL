// Maneja errores de TLD en tiempo de ejecucion.

/**
 * Instala un controlador global para errores "Unlisted TLDs".
 */
export function installTLDErrorHandler() {
  if (typeof window === 'undefined') return;

  const originalErrorHandler = window.onerror;

  window.onerror = function(
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ) {
    const messageStr = String(message);

    if (messageStr.includes('TLD') || messageStr.includes('Unlisted')) {
      console.warn('Error de TLD capturado y suprimido:', messageStr);
      return true;
    }

    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }

    return false;
  };

  const originalUnhandledRejectionHandler = window.onunhandledrejection;

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = String(event.reason);

    if (reason.includes('TLD') || reason.includes('Unlisted')) {
      console.warn('Promesa rechazada por TLD capturada y suprimida:', reason);
      event.preventDefault();
      return;
    }

    if (originalUnhandledRejectionHandler) {
      originalUnhandledRejectionHandler.call(window, event);
    }
  };
}

/**
 * Wrapper para la clase URL que maneja errores de TLD.
 */
export class SafeURL {
  private url: URL | null;
  private rawUrl: string;

  constructor(url: string | URL, base?: string | URL) {
    this.rawUrl = url.toString();

    try {
      this.url = new URL(url, base);
    } catch (e) {
      if (String(e).includes('TLD')) {
        console.debug('URL con TLD no listado, usando fallback:', url);
        this.url = null;
      } else {
        throw e;
      }
    }
  }

  get href(): string {
    return this.url?.href || this.rawUrl;
  }

  get hostname(): string {
    return this.url?.hostname || '';
  }

  get pathname(): string {
    return this.url?.pathname || '';
  }

  get protocol(): string {
    return this.url?.protocol || '';
  }

  toString(): string {
    return this.href;
  }
}
