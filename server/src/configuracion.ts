export type OpenMode = "server" | "client";

export interface LLMConfig {
  // "groq" o el host del proveedor compatible con OpenAI (ej. api.cerebras.ai)
  proveedor: string;
  baseUrl?: string;
  apiKey: string;
  model: string;
}

export interface AppConfig {
  port: number;
  llm: LLMConfig;
  tmdbAccessToken: string;
  googleBooksApiKey?: string;
  openMode: OpenMode;
}

// recibe env por parámetro para poder probarlo sin tocar process.env.
// si viene LLM_BASE_URL se usa ese proveedor (cualquiera compatible con OpenAI); si no, Groq
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const baseUrl = env.LLM_BASE_URL || undefined;
  const claveLlm = baseUrl ? "LLM_API_KEY" : "GROQ_API_KEY";
  const missing = [claveLlm, "TMDB_ACCESS_TOKEN"].filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}. Revisa server/.env`);
  }
  return {
    port: Number(env.PORT ?? 3001),
    llm: baseUrl
      ? {
          proveedor: new URL(baseUrl).hostname,
          baseUrl,
          apiKey: env.LLM_API_KEY as string,
          model: env.LLM_MODEL || "gpt-oss-120b"
        }
      : { proveedor: "groq", apiKey: env.GROQ_API_KEY as string, model: env.GROQ_MODEL || "openai/gpt-oss-120b" },
    tmdbAccessToken: env.TMDB_ACCESS_TOKEN as string,
    googleBooksApiKey: env.GOOGLE_BOOKS_API_KEY || undefined,
    openMode: env.OPEN_MODE === "client" ? "client" : "server"
  };
}
