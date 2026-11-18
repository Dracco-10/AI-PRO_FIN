import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolResult } from "../respuestaDeTool.js";
import { isAllowedUrl, siteName } from "./sitiosPermitidos.js";

export type UrlOpener = (url: string) => Promise<void>;

// el opener se inyecta: en modo server usa `open`, en modo client no hace nada y el widget hace window.open
export function createBrowserServer(opener: UrlOpener): McpServer {
  const server = new McpServer({ name: "browser-mcp", version: "1.0.0" });

  server.registerTool(
    "open_url",
    {
      description:
        "Abre una pestaña del navegador del usuario en Google Books o IMDB. SOLO úsala si el usuario lo pidió o aceptó explícitamente.",
      inputSchema: { url: z.string().url().max(300) },
      annotations: { openWorldHint: true }
    },
    ({ url }) =>
      toolResult(async () => {
        if (!isAllowedUrl(url)) {
          throw new Error("URL no permitida: solo se pueden abrir páginas https de Google Books o IMDB");
        }
        await opener(url);
        return { opened: true, url, site: siteName(url) };
      })
  );

  return server;
}
