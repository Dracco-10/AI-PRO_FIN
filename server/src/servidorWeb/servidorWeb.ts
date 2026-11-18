import { createServer, type Server } from "node:http";
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import type { ChatReply } from "../conversacion/servicioDeChat.js";

export interface ChatHandler {
  handle(sessionId: string, text: string): Promise<ChatReply>;
}

export const ClientMessage = z.object({
  type: z.literal("user_message"),
  sessionId: z.string().min(1).max(64),
  text: z.string().max(5000)
});

export type ServerMessage =
  | { type: "typing" }
  | { type: "assistant_message"; text: string; actions: ChatReply["actions"] }
  | { type: "error"; text: string };

export interface RateLimiter {
  allow(key: string): boolean;
}

// rate limit por conexión, para que nadie se acabe los tokens gratis de Groq
export function createRateLimiter(maxPerMinute = 10, now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((h) => t - h < 60_000);
      if (recent.length >= maxPerMinute) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    }
  };
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

export function createApp(chat: ChatHandler, limiter: RateLimiter = createRateLimiter()): Server {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  let connectionCounter = 0;

  wss.on("connection", (ws) => {
    const connectionId = `conn-${++connectionCounter}`;
    ws.on("message", async (raw) => {
      let parsed: z.infer<typeof ClientMessage>;
      try {
        parsed = ClientMessage.parse(JSON.parse(raw.toString()));
      } catch {
        send(ws, { type: "error", text: "Mensaje inválido" });
        return;
      }
      if (!limiter.allow(connectionId)) {
        send(ws, { type: "error", text: "Despacio 😅, esperá un momento antes de mandar otro mensaje." });
        return;
      }
      send(ws, { type: "typing" });
      const reply = await chat.handle(parsed.sessionId, parsed.text);
      send(ws, { type: "assistant_message", text: reply.text, actions: reply.actions });
    });
  });

  return server;
}
