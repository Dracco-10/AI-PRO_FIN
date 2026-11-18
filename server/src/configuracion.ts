export type OpenMode = "server" | "client";

export interface AppConfig {
  port: number;
  groqApiKey: string;
  groqModel: string;
  tmdbAccessToken: string;
  googleBooksApiKey?: string;
  openMode: OpenMode;
}

// recibe env por parámetro para poder probarlo sin tocar process.env
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const missing = ["GROQ_API_KEY", "TMDB_ACCESS_TOKEN"].filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}. Revisa server/.env`);
  }
  return {
    port: Number(env.PORT ?? 3001),
    groqApiKey: env.GROQ_API_KEY as string,
    groqModel: env.GROQ_MODEL || "openai/gpt-oss-120b",
    tmdbAccessToken: env.TMDB_ACCESS_TOKEN as string,
    googleBooksApiKey: env.GOOGLE_BOOKS_API_KEY || undefined,
    openMode: env.OPEN_MODE === "client" ? "client" : "server"
  };
}
