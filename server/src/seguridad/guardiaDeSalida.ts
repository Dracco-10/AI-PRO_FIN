export type OutputCheck = { allowed: true; text: string } | { allowed: false; reason: "canary" | "prompt_leak"; text: string };

export const LEAK_MESSAGE =
  "Mi configuración interna me la guardo 🤐, pero si querés te recomiendo una película o te comparo una con su libro.";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

export function promptFingerprints(prompts: string[], minLength = 35): string[] {
  return prompts
    .flatMap((p) => p.split(/[\n.:]+/))
    .map(normalize)
    .filter((s) => s.length >= minLength);
}

// última capa: si en la respuesta sale el canary o frases copiadas del prompt, no se manda
export class OutputGuard {
  private readonly fingerprints: string[];

  constructor(
    private readonly canary: string,
    systemPrompts: string[]
  ) {
    this.fingerprints = promptFingerprints(systemPrompts);
  }

  check(text: string): OutputCheck {
    if (text.includes(this.canary)) {
      return { allowed: false, reason: "canary", text: LEAK_MESSAGE };
    }
    const normalized = normalize(text);
    if (this.fingerprints.some((f) => normalized.includes(f))) {
      return { allowed: false, reason: "prompt_leak", text: LEAK_MESSAGE };
    }
    return { allowed: true, text };
  }
}
