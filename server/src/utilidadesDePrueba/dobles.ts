import type { ChatMessage, LLMClient, LLMResponse, ToolDefinition } from "../modeloIA/tiposDelModelo.js";
import type { FetchLike } from "../mcp/peticionesHttp.js";

/** LLM falso: responde con una lista de respuestas programadas, en orden. */
export class ScriptedLLM implements LLMClient {
  readonly calls: Array<{ messages: ChatMessage[]; tools: ToolDefinition[] }> = [];
  constructor(private readonly script: Array<LLMResponse | ((messages: ChatMessage[]) => LLMResponse)>) {}

  async chat(messages: ChatMessage[], tools: ToolDefinition[] = []): Promise<LLMResponse> {
    this.calls.push({ messages: [...messages], tools });
    const next = this.script.shift();
    if (!next) throw new Error("ScriptedLLM sin más respuestas");
    return typeof next === "function" ? next(messages) : next;
  }
}

export const say = (content: string): LLMResponse => ({ content, toolCalls: [] });
export const callTool = (name: string, args: Record<string, unknown>, id = `call-${name}`): LLMResponse => ({
  content: "",
  toolCalls: [{ id, name, arguments: args }]
});

/** fetch falso: busca la primera ruta cuyo texto esté contenido en la URL. */
export function fakeFetch(routes: Record<string, unknown>, status = 200): FetchLike & { urls: string[] } {
  const urls: string[] = [];
  const fn = async (url: string) => {
    urls.push(url);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status });
  };
  return Object.assign(fn, { urls });
}

export const TMDB_ROUTES = {
  "/search/movie": {
    results: [
      { id: 1, title: "Dune", release_date: "2021-09-15", vote_average: 7.8, overview: "Paul Atreides...", poster_path: "/dune.jpg" }
    ]
  },
  "/movie/1/recommendations": { results: [{ id: 2, title: "Dune: Parte Dos", poster_path: null }] },
  "/movie/1": {
    id: 1,
    title: "Dune",
    original_title: "Dune",
    release_date: "2021-09-15",
    vote_average: 7.8,
    overview: "Paul Atreides...",
    poster_path: "/dune.jpg",
    runtime: 155,
    genres: [{ id: 878, name: "Ciencia ficción" }],
    imdb_id: "tt1160419",
    keywords: { keywords: [{ id: 818, name: "based on novel or book" }] }
  },
  "/genre/movie/list": { genres: [{ id: 27, name: "Terror" }, { id: 35, name: "Comedia" }] },
  "/discover/movie": { results: [{ id: 3, title: "El Conjuro", vote_average: 7.5, poster_path: "/c.jpg" }] }
};

export const BOOKS_ROUTES = {
  "volumes/abc": {
    id: "abc",
    volumeInfo: { title: "Dune", authors: ["Frank Herbert"], averageRating: 4.5, pageCount: 600, description: "<b>Épica</b>" }
  },
  "volumes?": {
    items: [
      {
        id: "abc",
        volumeInfo: {
          title: "Dune",
          authors: ["Frank Herbert"],
          publishedDate: "1965",
          averageRating: 4.5,
          ratingsCount: 100,
          pageCount: 600,
          description: "Una épica en Arrakis",
          imageLinks: { thumbnail: "http://books.google.com/img.jpg" }
        }
      }
    ]
  }
};
