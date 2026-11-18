// arranque: se arman las piezas y se levanta el server
import "dotenv/config";
import open from "open";
import { MultiAgentSystem } from "./agentes/sistemaMultiagente.js";
import { ChatService } from "./conversacion/servicioDeChat.js";
import { InMemorySessionStore } from "./conversacion/historialDeSesiones.js";
import { loadConfig } from "./configuracion.js";
import { OutputGuard } from "./seguridad/guardiaDeSalida.js";
import { createApp } from "./servidorWeb/servidorWeb.js";
import { GroqClient } from "./modeloIA/clienteGroq.js";
import { GoogleBooksApi } from "./mcp/libros-google/clienteApiGoogleBooks.js";
import { TmdbApi } from "./mcp/peliculas-tmdb/clienteApiTmdb.js";

const config = loadConfig();

const system = await MultiAgentSystem.create({
  llm: new GroqClient(config.groqApiKey, config.groqModel),
  tmdb: new TmdbApi(config.tmdbAccessToken),
  books: new GoogleBooksApi(config.googleBooksApiKey),
  opener:
    config.openMode === "server"
      ? async (url) => {
          await open(url);
        }
      : async () => {}
});

const chat = new ChatService(
  system,
  new OutputGuard(system.canary, system.systemPrompts()),
  new InMemorySessionStore(),
  config.openMode
);

createApp(chat).listen(config.port, () => {
  console.info(`Butaca escuchando en http://localhost:${config.port} (websocket en /ws)`);
});
