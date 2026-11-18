import { describe, expect, it, vi } from "vitest";
import { ErrorDelProveedor, limpiarEsquema, OpenAICompatibleClient } from "./clienteOpenAICompatible.js";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const sinEspera = () => Promise.resolve();

describe("OpenAICompatibleClient", () => {
  it("manda la petición al endpoint /chat/completions con tools y parsea tool calls", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      ok({ choices: [{ message: { content: null, tool_calls: [{ id: "c1", function: { name: "buscar", arguments: '{"q":"dune"}' } }] } }] })
    );
    const client = new OpenAICompatibleClient("https://api.cerebras.ai/v1/", "key", "gpt-oss-120b", fetchFn);
    const res = await client.chat([{ role: "user", content: "hola" }], [{ name: "buscar", description: "d", parameters: {} }]);

    expect(res).toEqual({ content: "", toolCalls: [{ id: "c1", name: "buscar", arguments: { q: "dune" } }] });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.cerebras.ai/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer key");
    expect(JSON.parse(init.body)).toMatchObject({ model: "gpt-oss-120b", tool_choice: "auto" });
  });

  it("sin tools no manda tool_choice y tolera respuestas vacías", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(ok({ choices: [{ message: { content: "hola" } }] })).mockResolvedValueOnce(ok({}));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "m", fetchFn);
    expect(await client.chat([])).toEqual({ content: "hola", toolCalls: [] });
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).tool_choice).toBeUndefined();
    expect(await client.chat([])).toEqual({ content: "", toolCalls: [] });
  });

  it("si hay límite (429) espera lo que dice retry-after y reintenta", async () => {
    const esperar = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("lento", { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(new Response("lento", { status: 429 }))
      .mockResolvedValueOnce(ok({ choices: [{ message: { content: "listo" } }] }));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "m", fetchFn, esperar);
    expect((await client.chat([])).content).toBe("listo");
    expect(esperar).toHaveBeenNthCalledWith(1, 2000);
    expect(esperar).toHaveBeenNthCalledWith(2, 10000);
  });

  it("reintenta una vez un 400 y después lanza el error con el status", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("tool_use_failed", { status: 400 }));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "m", fetchFn, sinEspera);
    await expect(client.chat([])).rejects.toMatchObject({ status: 400 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("no reintenta errores de autenticación y se rinde tras varios 429", async () => {
    const auth = new OpenAICompatibleClient("https://x/v1", "k", "m", vi.fn().mockResolvedValue(new Response("no", { status: 401 })), sinEspera);
    await expect(auth.chat([])).rejects.toBeInstanceOf(ErrorDelProveedor);

    const lento = vi.fn().mockResolvedValue(new Response("lento", { status: 429 }));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "m", lento, sinEspera, 2);
    await expect(client.chat([])).rejects.toMatchObject({ status: 429 });
    expect(lento).toHaveBeenCalledTimes(3);
  });

  it("usa fetch y setTimeout reales si no se inyectan", () => {
    expect(new OpenAICompatibleClient("https://x/v1", "k", "m")).toBeInstanceOf(OpenAICompatibleClient);
  });

  it("limpia del esquema de las tools los campos que Gemini no acepta", () => {
    const esquema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      additionalProperties: false,
      properties: {
        url: { type: "string", format: "uri", maxLength: 300 },
        id: { type: "integer", exclusiveMinimum: 0 },
        tags: { type: "array", items: { type: "string", format: "x" } }
      },
      required: ["url"]
    };
    expect(limpiarEsquema(esquema)).toEqual({
      type: "object",
      properties: {
        url: { type: "string", maxLength: 300 },
        id: { type: "integer" },
        tags: { type: "array", items: { type: "string" } }
      },
      required: ["url"]
    });
    expect(limpiarEsquema([1, null])).toEqual([1, null]);
  });

  it("si un modelo está saturado (503) pasa al siguiente de la lista", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("saturado", { status: 503 }))
      .mockResolvedValueOnce(ok({ choices: [{ message: { content: "desde el respaldo" } }] }));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "modelo-a, modelo-b", fetchFn, sinEspera);
    expect(client.modelos).toEqual(["modelo-a", "modelo-b"]);
    expect((await client.chat([])).content).toBe("desde el respaldo");
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).model).toBe("modelo-a");
    expect(JSON.parse(fetchFn.mock.calls[1][1].body).model).toBe("modelo-b");
  });

  it("un error de red cuenta como servidor caído y se reintenta", async () => {
    const esperar = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(ok({ choices: [{ message: { content: "volvió" } }] }));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "m", fetchFn, esperar);
    expect((await client.chat([])).content).toBe("volvió");
    expect(esperar).toHaveBeenCalledTimes(1);
  });

  it("si todos los modelos siguen caídos, al final lanza el error", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("saturado", { status: 503 }));
    const client = new OpenAICompatibleClient("https://x/v1", "k", "a,b", fetchFn, sinEspera, 1);
    await expect(client.chat([])).rejects.toMatchObject({ status: 503 });
  });

  it("guarda y devuelve la firma (thought_signature) que exige Gemini 3", async () => {
    const firma = { google: { thought_signature: "abc" } };
    const fetchFn = vi.fn().mockImplementation(async () =>
      ok({ choices: [{ message: { content: "", tool_calls: [{ id: "c1", function: { name: "t", arguments: "{}" }, extra_content: firma }] } }] })
    );
    const client = new OpenAICompatibleClient("https://x/v1", "k", "m", fetchFn);
    const res = await client.chat([]);
    expect(res.toolCalls[0].extra).toEqual(firma);
    await client.chat([{ role: "assistant", content: "", toolCalls: res.toolCalls }]);
    const enviado = JSON.parse(fetchFn.mock.calls[1][1].body);
    expect(enviado.messages[0].tool_calls[0].extra_content).toEqual(firma);
  });
});
