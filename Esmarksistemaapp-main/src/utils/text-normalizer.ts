const MOJIBAKE_PATTERN = /[\u00c3\u00c2\u00e2\u00f0\u00ef\ufffd]/;
const TEXT_ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt'];

const WINDOWS_1252_BYTES: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

function toByte(char: string): number | null {
  const code = char.charCodeAt(0);
  if (code <= 0xff) return code;
  return WINDOWS_1252_BYTES[code] ?? null;
}

function decodeChunk(chunk: string): string {
  try {
    const encoded = Array.from(chunk)
      .map((char) => {
        const byte = toByte(char);
        return byte === null ? char : `%${byte.toString(16).padStart(2, '0')}`;
      })
      .join('');

    return decodeURIComponent(encoded);
  } catch {
    return chunk;
  }
}

function repairKnownSpanishWords(text: string): string {
  return text
    .replace(/Impresi[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'i' ? 'impresión' : 'Impresión')
    .replace(/Identificaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'i' ? 'identificación' : 'Identificación')
    .replace(/Rotulaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'r' ? 'rotulación' : 'Rotulación')
    .replace(/Cotizaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'c' ? 'cotización' : 'Cotización')
    .replace(/Configuraci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'c' ? 'configuración' : 'Configuración')
    .replace(/Sincronizaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 's' ? 'sincronización' : 'Sincronización')
    .replace(/Informaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'i' ? 'información' : 'Información')
    .replace(/Producci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'p' ? 'producción' : 'Producción')
    .replace(/Sublimaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 's' ? 'sublimación' : 'Sublimación')
    .replace(/Instalaci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'i' ? 'instalación' : 'Instalación')
    .replace(/Direcci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'd' ? 'dirección' : 'Dirección')
    .replace(/Acci[\u00f3\u00b3\ufffd]?n/gi, (match) => match[0] === 'a' ? 'acción' : 'Acción')
    .replace(/Categor[\u00ed\u00ad\ufffd]?a/gi, (match) => match[0] === 'c' ? 'categoría' : 'Categoría')
    .replace(/M[\u00ed\u00ad\ufffd]nimo/gi, (match) => match[0] === 'm' ? 'mínimo' : 'Mínimo')
    .replace(/C[\u00f3\u00b3\ufffd]digo/gi, (match) => match[0] === 'c' ? 'código' : 'Código')
    .replace(/D[\u00ed\u00ad\ufffd]a/gi, (match) => match[0] === 'd' ? 'día' : 'Día')
    .replace(/Tel[\u00e9\u00a9\ufffd]fono/gi, (match) => match[0] === 't' ? 'teléfono' : 'Teléfono')
    .replace(/Autom[\u00e1\u00a1\ufffd]tico/gi, (match) => match[0] === 'a' ? 'automático' : 'Automático')
    .replace(/Pr[\u00f3\u00b3\ufffd]ximo/gi, (match) => match[0] === 'p' ? 'próximo' : 'Próximo');
}

export function normalizeAppText(text: string): string {
  const knownFixed = repairKnownSpanishWords(text);
  if (!MOJIBAKE_PATTERN.test(knownFixed)) return knownFixed;

  let fixed = repairKnownSpanishWords(decodeChunk(knownFixed));
  if (fixed !== knownFixed || !MOJIBAKE_PATTERN.test(fixed)) return fixed;

  fixed = knownFixed.replace(/[\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2018-\u201e\u2020\u2021\u2026\u2030\u2039\u203a\u20ac]+/g, decodeChunk);

  return repairKnownSpanishWords(fixed)
    .replace(/\u00c2/g, '')
    .replace(/\ufffd/g, '')
    .replace(/\u00ef\u00bf\u00bd/g, '')
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, '"')
    .replace(/\u00e2\u20ac\u009d/g, '"');
}

function normalizeTextNode(node: Text) {
  const fixed = normalizeAppText(node.nodeValue || '');
  if (fixed !== node.nodeValue) {
    node.nodeValue = fixed;
  }
}

function normalizeElementAttributes(element: Element) {
  TEXT_ATTRIBUTES.forEach((attr) => {
    const value = element.getAttribute(attr);
    if (!value) return;

    const fixed = normalizeAppText(value);
    if (fixed !== value) {
      element.setAttribute(attr, fixed);
    }
  });
}

function normalizeNode(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    normalizeTextNode(root as Text);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) return;

  const element = root as Element;
  normalizeElementAttributes(element);

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    normalizeTextNode(node as Text);
    node = walker.nextNode();
  }

  element.querySelectorAll('*').forEach(normalizeElementAttributes);
}

export function installTextNormalizer() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const run = () => normalizeNode(document.body);

  if (document.body) {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(normalizeNode);

      if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
        normalizeTextNode(mutation.target as Text);
      }

      if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
        normalizeElementAttributes(mutation.target as Element);
      }
    });
  });

  const startObserver = () => {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRIBUTES,
    });
  };

  if (document.body) {
    startObserver();
  } else {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  }
}
