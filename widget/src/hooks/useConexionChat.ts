import { useCallback, useEffect, useRef, useState } from "react";
import { getSessionId, isOpenableUrl } from "../seguridadCliente";
import type { ConnectionStatus, Message, ServerMessage, SocketFactory, SocketLike } from "../tipos";

export interface OpcionesDeConexion {
  wsUrl: string;
  createSocket?: SocketFactory;
  openUrl?: (url: string) => void;
  reconnectMs?: number;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "¡Qué tal! Soy **Butaca** 🍿. Pedime una recomendación, preguntame por un libro o decime una peli y te digo si vale más la pena verla o leer el libro."
};

let counter = 0;
const nextId = () => `m-${++counter}`;

export function useConexionChat({
  wsUrl,
  createSocket = (url) => new WebSocket(url),
  openUrl = (url) => window.open(url, "_blank", "noopener,noreferrer"),
  reconnectMs = 2000
}: OpcionesDeConexion) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [typing, setTyping] = useState(false);
  const socketRef = useRef<SocketLike | null>(null);
  const sessionId = useRef(getSessionId());
  // en refs para que no se reconecte en cada render
  const createRef = useRef(createSocket);
  const openRef = useRef(openUrl);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus("connecting");
      const socket = createRef.current(wsUrl);
      socketRef.current = socket;
      socket.onopen = () => setStatus("open");
      socket.onclose = () => {
        setStatus("closed");
        setTyping(false);
        if (!disposed) timer = setTimeout(connect, reconnectMs);
      };
      socket.onmessage = (ev) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMessage;
        } catch {
          return;
        }
        if (msg.type === "typing") {
          setTyping(true);
          return;
        }
        setTyping(false);
        if (msg.type === "assistant_message") {
          setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: msg.text }]);
          (msg.actions ?? [])
            .filter((a) => a.type === "open_url" && isOpenableUrl(a.url))
            .forEach((a) => openRef.current(a.url));
        } else {
          setMessages((prev) => [...prev, { id: nextId(), role: "system", text: msg.text }]);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      socketRef.current?.close();
    };
  }, [wsUrl, reconnectMs]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    const socket = socketRef.current;
    if (!trimmed || !socket || socket.readyState !== 1) return false;
    socket.send(JSON.stringify({ type: "user_message", sessionId: sessionId.current, text: trimmed }));
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: trimmed }]);
    return true;
  }, []);

  return { messages, status, typing, send };
}
