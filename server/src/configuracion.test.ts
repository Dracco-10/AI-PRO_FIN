import { describe, expect, it } from "vitest";
import { loadConfig } from "./configuracion.js";

describe("loadConfig", () => {
  it("lanza error si faltan las keys obligatorias", () => {
    expect(() => loadConfig({})).toThrow(/GROQ_API_KEY, TMDB_ACCESS_TOKEN/);
  });

  it("usa valores por defecto", () => {
    const c = loadConfig({ GROQ_API_KEY: "g", TMDB_ACCESS_TOKEN: "t" });
    expect(c).toEqual({
      port: 3001,
      groqApiKey: "g",
      groqModel: "openai/gpt-oss-120b",
      tmdbAccessToken: "t",
      googleBooksApiKey: undefined,
      openMode: "server"
    });
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
    expect(c.groqModel).toBe("otro");
    expect(c.googleBooksApiKey).toBe("b");
    expect(c.openMode).toBe("client");
  });
});
