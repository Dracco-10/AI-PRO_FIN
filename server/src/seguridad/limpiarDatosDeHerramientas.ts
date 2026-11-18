import { INJECTION_PATTERNS, LEAKAGE_PATTERNS } from "./patronesDeAtaque.js";

// inyección indirecta: la sinopsis de un libro podría traer instrucciones escondidas.
// se quitan esas frases y se marca todo como datos
export function sanitizeToolOutput(text: string): string {
  let clean = text.normalize("NFKC");
  for (const pattern of [...INJECTION_PATTERNS, ...LEAKAGE_PATTERNS]) {
    clean = clean.replace(new RegExp(pattern.source, "gi"), "[contenido removido]");
  }
  return `<datos_herramienta>\n${clean}\n</datos_herramienta>`;
}
