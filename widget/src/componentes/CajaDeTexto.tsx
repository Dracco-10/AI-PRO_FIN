import { useState, type FormEvent } from "react";

interface Props {
  disabled: boolean;
  onSend: (text: string) => boolean;
}

export const MAX_LENGTH = 1000;

export function CajaDeTexto({ disabled, onSend }: Props) {
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (onSend(text)) setText("");
  };

  return (
    <form className="agichat-composer" onSubmit={submit}>
      <input
        aria-label="Escribí tu mensaje"
        placeholder={disabled ? "Conectando..." : "¿Qué se te antoja ver?"}
        value={text}
        maxLength={MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || text.trim().length === 0} aria-label="Enviar">
        ➤
      </button>
    </form>
  );
}
