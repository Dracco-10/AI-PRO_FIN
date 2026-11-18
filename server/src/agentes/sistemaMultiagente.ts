import { randomUUID } from "node:crypto";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ChatMessage, LLMClient } from "../modeloIA/tiposDelModelo.js";
import { createBooksServer } from "../mcp/libros-google/servidorMcpLibros.js";
import type { GoogleBooksApi } from "../mcp/libros-google/clienteApiGoogleBooks.js";
import { createBrowserServer, type UrlOpener } from "../mcp/navegador/servidorMcpNavegador.js";
import { createTmdbServer } from "../mcp/peliculas-tmdb/servidorMcpPeliculas.js";
import type { TmdbApi } from "../mcp/peliculas-tmdb/clienteApiTmdb.js";
import { Agent, type ExecutedToolCall } from "./agenteBase.js";
import { DelegationExecutor } from "./delegarAExpertos.js";
import { bookExpertPrompt, comparisonExpertPrompt, movieExpertPrompt, orchestratorPrompt } from "./promptsDeLosAgentes.js";
import { CompositeExecutor, connectInMemory, McpToolbox } from "./herramientasMcp.js";

export interface SystemDeps {
  llm: LLMClient;
  tmdb: TmdbApi;
  books: GoogleBooksApi;
  opener: UrlOpener;
  canary?: string;
}

export interface TurnResult {
  text: string;
  toolCalls: ExecutedToolCall[];
}

export const MOVIE_TOOLS = ["search_movies", "get_movie_details", "recommend_movies"];
export const BOOK_TOOLS = ["search_books", "get_book_details"];

// patrón supervisor:
//   orquestador ─┬─ experto películas   → tmdb-mcp
//                ├─ experto libros      → books-mcp
//                ├─ experto comparador  → tmdb-mcp + books-mcp
//                └─ open_url            → browser-mcp
export class MultiAgentSystem {
  readonly canary: string;
  private constructor(
    private readonly llm: LLMClient,
    private readonly toolbox: McpToolbox,
    private readonly clients: Client[],
    canary: string
  ) {
    this.canary = canary;
  }

  static async create(deps: SystemDeps): Promise<MultiAgentSystem> {
    const clients = await Promise.all([
      connectInMemory(createTmdbServer(deps.tmdb), "cinebot-tmdb"),
      connectInMemory(createBooksServer(deps.books), "cinebot-books"),
      connectInMemory(createBrowserServer(deps.opener), "cinebot-browser")
    ]);
    const toolbox = await McpToolbox.fromClients(clients);
    return new MultiAgentSystem(deps.llm, toolbox, clients, deps.canary ?? `CANARY-${randomUUID()}`);
  }

  // el OutputGuard los usa para detectar si alguno se filtró
  systemPrompts(): string[] {
    return [
      orchestratorPrompt(this.canary),
      movieExpertPrompt(this.canary),
      bookExpertPrompt(this.canary),
      comparisonExpertPrompt(this.canary)
    ];
  }

  // agentes nuevos en cada turno, son baratos y así no se mezcla el estado de dos usuarios
  async runTurn(conversation: ChatMessage[]): Promise<TurnResult> {
    const delegation = new DelegationExecutor([
      {
        toolName: "ask_movie_expert",
        description: "Experto en películas (TMDB): buscar, detalles, póster, link IMDB y recomendaciones.",
        agent: new Agent("movie_expert", this.llm, movieExpertPrompt(this.canary), this.toolbox.only(MOVIE_TOOLS))
      },
      {
        toolName: "ask_book_expert",
        description: "Experto en libros (Google Books): buscar libros, rating, páginas y link.",
        agent: new Agent("book_expert", this.llm, bookExpertPrompt(this.canary), this.toolbox.only(BOOK_TOOLS))
      },
      {
        toolName: "ask_comparison_expert",
        description: "Compara una película con el libro en que se basa y dice si vale la pena verla.",
        agent: new Agent(
          "comparison_expert",
          this.llm,
          comparisonExpertPrompt(this.canary),
          this.toolbox.only([...MOVIE_TOOLS, ...BOOK_TOOLS]),
          12
        )
      }
    ]);
    const orchestrator = new Agent(
      "orchestrator",
      this.llm,
      orchestratorPrompt(this.canary),
      new CompositeExecutor([delegation, this.toolbox.only(["open_url"])]),
      6
    );
    const result = await orchestrator.run(conversation);
    return { text: result.text, toolCalls: [...delegation.log, ...result.toolCalls] };
  }

  async close(): Promise<void> {
    await Promise.all(this.clients.map((c) => c.close()));
  }
}
