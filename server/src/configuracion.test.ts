import { describe, expect, it } from "vitest";
import { loadConfig } from "./configuracion.js";
import { GroqClient } from "./modeloIA/clienteGroq.js";
import { OpenAICompatibleClient } from "./modeloIA/clienteOpenAICompatible.js";
import { crearClienteLLM } from "./modeloIA/crearClienteLLM.js";

describe("loadConfig", () => {
  it("lanza error si faltan las keys obligatorias", () => {
    expect(() => loadConfig({})).toThrow(/GROQ_API_KEY, TMDB_ACCESS_TOKEN/);
    expect(() => loadConfig({ LLM_BASE_URL: "https://api.cerebras.ai/v1", TMDB_ACCESS_TOKEN: "t" })).toThrow(/LLM_API_KEY/);
  });

  it("por defecto usa Groq", () => {
    const c = loadConfig({ GROQ_API_KEY: "g", TMDB_ACCESS_TOKEN: "t" });
    expect(c).toEqual({
      port: 3001,
      llm: { proveedor: "groq", apiKey: "g", model: "openai/gpt-oss-120b" },
      tmdbAccessToken: "t",
      googleBooksApiKey: undefined,
      openMode: "server"
    });
  });

  it("con LLM_BASE_URL usa un proveedor compatible con OpenAI (ej. Cerebras)", () => {
    const c = loadConfig({ LLM_BASE_URL: "https://api.cerebras.ai/v1", LLM_API_KEY: "c", TMDB_ACCESS_TOKEN: "t" });
    expect(c.llm).toEqual({ proveedor: "api.cerebras.ai", baseUrl: "https://api.cerebras.ai/v1", apiKey: "c", model: "gpt-oss-120b" });
    const conModelo = loadConfig({ LLM_BASE_URL: "https://x.ai/v1", LLM_API_KEY: "c", LLM_MODEL: "otro", TMDB_ACCESS_TOKEN: "t" });
    expect(conModelo.llm.model).toBe("otro");
  });

  it("respeta los valores del entorno", () => {
    const c = loadConfig({
      GROQ_API_KEY: "g",
      TMDB_ACCESS_TOKEN: "t",
      PORT: "4000",
      GROQ_MODEL: "otro",
      GOOGLE_BOOKS_API_KEY: "b",
      OPEN_MODE: "client"
    });
    expect(c.port).toBe(4000);
    expect(c.llm.model).toBe("otro");
    expect(c.googleBooksApiKey).toBe("b");
    expect(c.openMode).toBe("client");
  });
});

describe("crearClienteLLM", () => {
  it("escoge el adaptador según el proveedor", () => {
    expect(crearClienteLLM({ proveedor: "groq", apiKey: "g", model: "m" })).toBeInstanceOf(GroqClient);
    expect(crearClienteLLM({ proveedor: "api.cerebras.ai", baseUrl: "https://api.cerebras.ai/v1", apiKey: "c", model: "m" })).toBeInstanceOf(
      OpenAICompatibleClient
    );
  });
});
