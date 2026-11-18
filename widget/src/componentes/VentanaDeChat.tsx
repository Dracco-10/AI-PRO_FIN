import { useState } from "react";
import { useConexionChat, type OpcionesDeConexion } from "../hooks/useConexionChat";
import { CajaDeTexto } from "./CajaDeTexto";
import { ListaDeMensajes } from "./ListaDeMensajes";
import { CreditoTmdb } from "./CreditoTmdb";

export interface VentanaDeChatProps extends OpcionesDeConexion {
  title?: string;
  defaultOpen?: boolean;
}

const STATUS_LABEL = { connecting: "Conectando…", open: "En sala", closed: "Reconectando…" } as const;

export function VentanaDeChat({ title = "Butaca", defaultOpen = false, ...chatOptions }: VentanaDeChatProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { messages, status, typing, send } = useConexionChat(chatOptions);

  return (
    <div className="agichat-root">
      {open && (
        <section className="agichat-panel" aria-label={`Chat con ${title}`}>
          <header className="agichat-header">
            <div>
              <strong>{title}</strong>
              <small className={`agichat-status agichat-status-${status}`}>{STATUS_LABEL[status]}</small>
            </div>
            <button aria-label="Cerrar chat" onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>
          <ListaDeMensajes messages={messages} typing={typing} />
          <CajaDeTexto disabled={status !== "open"} onSend={send} />
          <CreditoTmdb />
        </section>
      )}
      <button className="agichat-launcher" aria-label={open ? "Ocultar chat" : "Abrir chat"} onClick={() => setOpen((o) => !o)}>
        {open ? "✕" : "🎟️"}
      </button>
    </div>
  );
}
