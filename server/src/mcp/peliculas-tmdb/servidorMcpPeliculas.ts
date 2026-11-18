import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolResult } from "../respuestaDeTool.js";
import type { TmdbApi } from "./clienteApiTmdb.js";

export function createTmdbServer(api: TmdbApi): McpServer {
  const server = new McpServer({ name: "tmdb-mcp", version: "1.0.0" });

  server.registerTool(
    "search_movies",
    {
      description: "Busca películas por título en TMDB. Devuelve id, título, fecha, rating, sinopsis y URL del póster.",
      inputSchema: {
        query: z.string().min(1).max(100).describe("Título o parte del título"),
        year: z.number().int().min(1880).max(2100).optional().describe("Año de estreno (opcional)")
      },
      annotations: { readOnlyHint: true }
    },
    ({ query, year }) => toolResult(() => api.searchMovies(query, year))
  );

  server.registerTool(
    "get_movie_details",
    {
      description:
        "Detalle de una película por id de TMDB: géneros, duración, rating, póster, link de IMDB y si está basada en un libro.",
      inputSchema: { movie_id: z.number().int().positive() },
      annotations: { readOnlyHint: true }
    },
    ({ movie_id }) => toolResult(() => api.getMovieDetails(movie_id))
  );

  server.registerTool(
    "recommend_movies",
    {
      description:
        "Recomienda películas populares. Filtra por género (ej. 'terror', 'comedia'), por similitud con otra película (id) o solo las basadas en libros.",
      inputSchema: {
        genre: z.string().max(40).optional(),
        similar_to_movie_id: z.number().int().positive().optional(),
        based_on_book: z.boolean().optional()
      },
      annotations: { readOnlyHint: true }
    },
    ({ genre, similar_to_movie_id, based_on_book }) =>
      toolResult(() =>
        api.recommendMovies({ genre, similarToMovieId: similar_to_movie_id, basedOnBook: based_on_book })
      )
  );

  return server;
}
