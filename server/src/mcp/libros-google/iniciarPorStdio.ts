// Arranca el MCP Server de Google Books por stdio.
import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleBooksApi } from "./clienteApiGoogleBooks.js";
import { createBooksServer } from "./servidorMcpLibros.js";

await createBooksServer(new GoogleBooksApi(process.env.GOOGLE_BOOKS_API_KEY)).connect(new StdioServerTransport());
