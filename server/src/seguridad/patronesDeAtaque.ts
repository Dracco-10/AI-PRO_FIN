// Patrones de ataque (OWASP LLM Top 10 2025)
// LLM01 = prompt injection (cambiarle el rol o las reglas al modelo)
// LLM07 = system prompt leakage (sacarle sus instrucciones internas)
// van en español (con voseo) e inglés porque la gente escribe de las dos formas
export const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignor[aáe]|olvid[aáe]|forget|omit[eéí]|disregard|salt[aá]|bypass)(?![a-z])[^.\n]{0,40}\b(instrucciones|instructions|reglas|rules|indicaciones|restricciones|restrictions|prompt|guidelines|directrices)\b/i,
  /\b(a partir de ahora|from now on|desde ahora)\b[^.\n]{0,30}\b(eres|ser[aá]s|vas a ser|you are|you will be|act[uú]a)\b/i,
  /\b(ahora eres|you are now|now you are|finge (que eres|ser)|pretend (to be|you are)|roleplay as)\b/i,
  /\b(DAN|do anything now|developer mode|modo (desarrollador|dios|sin restricciones|admin)|jailbreak|god mode)\b/i,
  /(<\|im_start\|>|<\|system\|>|\[\/?(system|inst)\]|<\/?system>|###\s*(system|instrucci[oó]n))/i,
  /\b(nuevas instrucciones|new instructions|override|sobrescribe)\b[^.\n]{0,20}[:]/i,
  /\b(tu nueva tarea|your new task|nota para la ia|note to the ai|para el asistente:|to the assistant:|instrucci[oó]n para el modelo)/i
];

export const LEAKAGE_PATTERNS: RegExp[] = [
  /\b(system prompt|prompt del sistema|prompt de sistema|mensaje de sistema|system message|initial prompt|prompt inicial)\b/i,
  /\b(revel[aá]|reveal|muestra|mostr[aá]|mostrame|show|dime|decime|dec[ií]|tell me|imprim[eií]|imprimime|print|repet[ií]|repite|repeat|escrib[eíi]|write|copi[aá]|copy|traduc[eí]|translate|resum[eí]|summarize|cu[aá]les son)(?![a-z])[^.\n]{0,40}\b(tus|tu|your|las|the|sus)\b[^.\n]{0,20}\b(instrucciones|instructions|reglas internas|configuraci[oó]n|configuration|prompt|directrices|guidelines)\b/i,
  /\b(repite|repeat)\b[^.\n]{0,30}\b(todo lo anterior|everything above|the text above|el texto de arriba|lo de arriba|above)\b/i,
  /\b(token|clave|c[oó]digo) (interno|secreto|canary|confidencial)\b/i,
  /\bwhat (were|are) you told\b|\bqu[eé] te (dijeron|ordenaron|programaron)\b/i,
  /\b(reglas|instrucciones|rules|instructions)\b (que|which|that) (te (dieron|dio|pusieron|programaron)|sigues|tienes|you (follow|were given|have))\b/i,
  /\b(como la tienes guardada|tal como (la|lo) tienes|exactly as (written|stored)|verbatim|word for word)\b/i,
  /\b(lista|list|enumera|nombre exacto)\b[^.\n]{0,60}\b(herramientas?|funci[oó]n(es)?|tools?|functions?)\b[^.\n]{0,40}\b(puedes|can|tienes|usas)\b/i
];

export type AttackCategory = "LLM01" | "LLM07";

export function detectAttack(text: string): AttackCategory | null {
  // normalizar primero: así no se lo saltan con espacios dobles o caracteres invisibles
  const normalized = text.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ");
  if (LEAKAGE_PATTERNS.some((p) => p.test(normalized))) return "LLM07";
  if (INJECTION_PATTERNS.some((p) => p.test(normalized))) return "LLM01";
  return null;
}
