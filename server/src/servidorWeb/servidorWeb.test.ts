import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { createApp, createRateLimiter, type ChatHandler } from "./servidorWeb.js";

const servers: Array<ReturnType<typeof createApp>> = [];
afterEach(() => {
  servers.splice(0).forEach((s) => s.close());
});

async function start(chat: ChatHandler, limiter = createRateLimiter()) {
  const server = createApp(chat, limiter);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  await new Promise((resolve) => ws.once("open", resolve));
  return { server, ws };
}

function nextMessages(ws: WebSocket, count: number): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve) => {
    const out: Array<Record<string, unknown>> = [];
    ws.on("message", (data) => {
      out.push(JSON.parse(data.toString()));
      if (out.length === count) resolve(out);
    });
  });
}

const chat: ChatHandler = {
  handle: vi.fn(async () => ({ text: "Hola 🎬", actions: [], toolCalls: [] }))
};

describe("HTTP + WebSocket", () => {
  it("GET /health", async () => {
    const res = await request(createApp(chat)).get("/health");
    expect(res.body).toEqual({ status: "ok" });
  });

  it("manda typing y luego la respuesta del asistente", async () => {
    const { ws } = await start(chat);
    const msgs = nextMessages(ws, 2);
    ws.send(JSON.stringify({ type: "user_message", sessionId: "s1", text: "hola" }));
    expect(await msgs).toEqual([{ type: "typing" }, { type: "assistant_message", text: "Hola 🎬", actions: [] }]);
    ws.close();
  });

  it("rechaza mensajes inválidos", async () => {
    const { ws } = await start(chat);
    const msgs = nextMessages(ws, 1);
    ws.send("esto no es json");
    expect((await msgs)[0]).toEqual({ type: "error", text: "Mensaje inválido" });
    ws.close();
  });

  it("aplica rate limit", async () => {
    const { ws } = await start(chat, { allow: () => false });
    const msgs = nextMessages(ws, 1);
    ws.send(JSON.stringify({ type: "user_message", sessionId: "s1", text: "hola" }));
    expect((await msgs)[0]).toMatchObject({ type: "error" });
    ws.close();
  });
});

describe("createRateLimiter", () => {
  it("permite N mensajes por minuto por conexión", () => {
    let t = 0;
    const limiter = createRateLimiter(2, () => t);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
    t = 61_000;
    expect(limiter.allow("a")).toBe(true);
  });
});
