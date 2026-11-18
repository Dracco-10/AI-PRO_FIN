import { describe, expect, it, vi } from "vitest";
import { GroqClient, parseArguments, toGroqMessages, type GroqLike } from "./clienteGroq.js";

function fakeGroq(create: GroqLike["chat"]["completions"]["create"]): GroqLike {
  return { chat: { completions: { create } } };
}

describe("toGroqMessages", () => {
  it("convierte mensajes de tool y de assistant con tool calls al formato de Groq", () => {
    const out = toGroqMessages([
      { role: "system", content: "s" },
      { role: "assistant", content: "", toolCalls: [{ id: "1", name: "x", arguments: { a: 1 } }] },
      { role: "tool", content: "r", toolCallId: "1" },
      { role: "assistant", content: "fin" }
    ]);
    expect(out[0]).toEqual({ role: "system", content: "s" });
    expect(out[1]).toMatchObject({ tool_calls: [{ id: "1", type: "function", function: { name: "x", arguments: '{"a":1}' } }] });
    expect(out[2]).toEqual({ role: "tool", content: "r", tool_call_id: "1" });
    expect(out[3]).toEqual({ role: "assistant", content: "fin" });
  });
});

describe("parseArguments", () => {
  it("parsea JSON válido y tolera basura", () => {
    expect(parseArguments('{"q":"dune"}')).toEqual({ q: "dune" });
    expect(parseArguments("no es json")).toEqual({});
    expect(parseArguments("")).toEqual({});
    expect(parseArguments("null")).toEqual({});
  });
});

describe("GroqClient", () => {
  it("manda tools y parsea tool calls", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: null, tool_calls: [{ id: "c1", function: { name: "search", arguments: '{"q":"a"}' } }] } }]
    });
    const client = new GroqClient("key", "modelo", fakeGroq(create));
    const res = await client.chat([{ role: "user", content: "hola" }], [{ name: "search", description: "d", parameters: {} }]);
    expect(res).toEqual({ content: "", toolCalls: [{ id: "c1", name: "search", arguments: { q: "a" } }] });
    expect(create.mock.calls[0][0]).toMatchObject({ model: "modelo", tool_choice: "auto" });
  });

  it("no manda tools si no hay y reintenta una vez si falla", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("tool_use_failed"))
      .mockResolvedValueOnce({ choices: [{ message: { content: "hola" } }] });
    const client = new GroqClient("key", "modelo", fakeGroq(create));
    const res = await client.chat([{ role: "user", content: "hola" }]);
    expect(res).toEqual({ content: "hola", toolCalls: [] });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].tools).toBeUndefined();
  });

  it("maneja respuestas vacías y crea el SDK real si no se inyecta", async () => {
    const client = new GroqClient("key", "modelo", fakeGroq(vi.fn().mockResolvedValue({ choices: [] })));
    expect(await client.chat([])).toEqual({ content: "", toolCalls: [] });
    expect(new GroqClient("key", "modelo")).toBeInstanceOf(GroqClient);
  });
});
