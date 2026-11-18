import type { ChatMessage } from "../modeloIA/tiposDelModelo.js";

// si se levantan varias instancias del server, esto se cambia por Redis y listo
export interface SessionStore {
  get(sessionId: string): ChatMessage[];
  append(sessionId: string, ...messages: ChatMessage[]): void;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, ChatMessage[]>();

  constructor(
    private readonly maxMessages = 12,
    private readonly maxSessions = 500
  ) {}

  get(sessionId: string): ChatMessage[] {
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  append(sessionId: string, ...messages: ChatMessage[]): void {
    const history = [...(this.sessions.get(sessionId) ?? []), ...messages].slice(-this.maxMessages);
    this.sessions.delete(sessionId); // re-insertar la deja como la más reciente
    this.sessions.set(sessionId, history);
    if (this.sessions.size > this.maxSessions) {
      const oldest = this.sessions.keys().next().value as string;
      this.sessions.delete(oldest);
    }
  }
}
