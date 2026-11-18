import { useEffect, useRef } from "react";
import Markdown, { type Components } from "react-markdown";
import { isTrustedImage } from "../seguridadCliente";
import type { Message } from "../tipos";

// react-markdown no renderiza HTML crudo, entonces un <script> sale como texto
const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    isTrustedImage(src) ? (
      <img className="agichat-poster" src={src} alt={alt ?? "Imagen"} loading="lazy" />
    ) : (
      <span className="agichat-blocked-img">[imagen no permitida: {alt}]</span>
    )
};

interface Props {
  messages: Message[];
  typing: boolean;
}

export function ListaDeMensajes({ messages, typing }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="agichat-messages" role="log" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className={`agichat-msg agichat-msg-${m.role}`} data-testid={`msg-${m.role}`}>
          {m.role === "user" ? m.text : <Markdown components={markdownComponents}>{m.text}</Markdown>}
        </div>
      ))}
      {typing && (
        <div className="agichat-typing" aria-label="Butaca está escribiendo">
          <span />
          <span />
          <span />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
