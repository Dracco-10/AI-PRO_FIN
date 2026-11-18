import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolResult } from "../respuestaDeTool.js";
import type { GoogleBooksApi } from "./clienteApiGoogleBooks.js";

export function createBooksServer(api: GoogleBooksApi): McpServer {
  const server = new McpServer({ name: "books-mcp", version: "1.0.0" });

  server.registerTool(
    "search_books",
    {
      description: "Busca libros por título (y opcionalmente autor) en Google Books. Devuelve rating, páginas, sinopsis y link.",
      inputSchema: {
        query: z.string().min(1).max(100),
        author: z.string().max(60).optional()
      },
      annotations: { readOnlyHint: true }
    },
    ({ query, author }) => toolResult(() => api.searchBooks(query, author))
  );

  server.registerTool(
    "get_book_details",
    {
      description: "Detalle de un libro por id de Google Books.",
      inputSchema: { book_id: z.string().min(1).max(40) },
      annotations: { readOnlyHint: true }
    },
    ({ book_id }) => toolResult(() => api.getBook(book_id))
  );

  return server;
}
