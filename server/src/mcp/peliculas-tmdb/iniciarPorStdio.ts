// Arranca el MCP Server de TMDB por stdio, para conectarlo a otros agentes (ej. Claude Desktop).
import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TmdbApi } from "./clienteApiTmdb.js";
import { createTmdbServer } from "./servidorMcpPeliculas.js";

const token = process.env.TMDB_ACCESS_TOKEN;
if (!token) throw new Error("Falta TMDB_ACCESS_TOKEN");
await createTmdbServer(new TmdbApi(token)).connect(new StdioServerTransport());
