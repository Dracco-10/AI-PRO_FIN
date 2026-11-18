import { detectAttack, type AttackCategory } from "./patronesDeAtaque.js";

export const MAX_INPUT_LENGTH = 1000;

export type InputCheck =
  | { allowed: true; text: string }
  | { allowed: false; reason: "empty" | "too_long" | "attack"; category?: AttackCategory; message: string };

export const REFUSAL_MESSAGE =
  "Eso no lo puedo hacer 🙂. Yo solo te ayudo con películas y libros: recomendaciones, pósters y si vale más la peli o el libro.";

// capa 1: se revisa el mensaje antes de que llegue al LLM
export function checkInput(raw: string): InputCheck {
  // eslint-disable-next-line no-control-regex -- queremos quitar justamente los caracteres de control
  const text = raw.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  if (text.length === 0) {
    return { allowed: false, reason: "empty", message: "Escribime algo para empezar." };
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return {
      allowed: false,
      reason: "too_long",
      message: `Uy, ese mensaje está muy largo (máximo ${MAX_INPUT_LENGTH} caracteres).`
    };
  }
  const category = detectAttack(text);
  if (category) {
    return { allowed: false, reason: "attack", category, message: REFUSAL_MESSAGE };
  }
  return { allowed: true, text };
}
