import { createRoot, type Root } from "react-dom/client";
import { VentanaDeChat, type VentanaDeChatProps } from "./componentes/VentanaDeChat";
import "./estilos.css";

// uso: mountChatWidget(document.getElementById("chat")!, { wsUrl: "wss://api.agichat.com/ws" })
export function mountChatWidget(element: HTMLElement, props: VentanaDeChatProps): Root {
  const root = createRoot(element);
  root.render(<VentanaDeChat {...props} />);
  return root;
}

export function defaultWsUrl(loc: Pick<Location, "protocol" | "host"> = window.location): string {
  return `${loc.protocol === "https:" ? "wss" : "ws"}://${loc.host}/ws`;
}

export { VentanaDeChat };
