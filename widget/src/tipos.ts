export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  text: string;
}

export type ConnectionStatus = "connecting" | "open" | "closed";

export type ServerMessage =
  | { type: "typing" }
  | { type: "assistant_message"; text: string; actions?: Array<{ type: "open_url"; url: string }> }
  | { type: "error"; text: string };

export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
}

export type SocketFactory = (url: string) => SocketLike;
