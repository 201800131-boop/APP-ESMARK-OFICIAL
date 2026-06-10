import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { Toaster } from "./components/ui/sonner";
import "./index.css";
import "./styles/globals.css";

// Instalar el manejador de TLD antes de cargar componentes.
import { installTLDErrorHandler } from "./utils/tld-error-fix";
import { installTextNormalizer } from "./utils/text-normalizer";
installTLDErrorHandler();
installTextNormalizer();

// Polyfill para evitar problemas de validacion de TLDs en librerias externas.
if (typeof window !== "undefined") {
  // Shim: prevenir ReferenceError si algun paquete usa `dragEvent` global.
  try {
    if (!(window as any).dragEvent) {
      (window as any).dragEvent = null;
    }
  } catch {}

  // Deshabilitar service workers para evitar errores de TLD.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  }

  // Polyfill para URL con manejo de errores de TLD.
  const originalURLConstructor = window.URL;
  try {
    window.URL = new Proxy(originalURLConstructor, {
      construct(target, args) {
        try {
          return new target(...args);
        } catch (e) {
          if (e instanceof TypeError && args[0]?.includes("://")) {
            const urlStr = args[0];
            const fallbackUrl = new target("http://example.com");
            try {
              if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
                return fallbackUrl;
              }
            } catch {}
          }
          throw e;
        }
      },
    });
  } catch (e) {
    console.warn("No se pudo aplicar polyfill de URL:", e);
  }
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <App />
    <Toaster richColors position="top-right" />
  </ThemeProvider>
);
