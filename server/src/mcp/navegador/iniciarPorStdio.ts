// Arranca el MCP Server de navegador por stdio.
import open from "open";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBrowserServer } from "./servidorMcpNavegador.js";

await createBrowserServer(async (url) => {
  await open(url);
}).connect(new StdioServerTransport());
