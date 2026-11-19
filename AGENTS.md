# AGENTS.md

Guía para herramientas de codeo agéntico (Claude Code, Copilot, Cursor, etc.) que trabajen en este repo.

## Qué es

Butaca es un sistema multiagente (un orquestador y tres expertos) que recomienda películas con TMDB, busca libros con Google Books, compara libro contra película y abre pestañas en Google Books o IMDB. Es un monorepo de npm workspaces:

- `server/`: Node 22 + TypeScript (ESM). Agentes, MCP servers, seguridad y servidor Express + WebSocket.
- `widget/`: React 18 + Vite + TypeScript. El widget de chat que se conecta por WebSocket.

Los nombres de carpetas y archivos están en español y describen lo que hacen. Mantené esa convención cuando agregues archivos nuevos (por ejemplo `seguridad/detectorDeSpam.ts`, no `security/spam.ts`). Las clases y funciones internas del server siguen en inglés.

## Comandos

```bash
npm install                 # instalar todo desde la raíz
npm run lint                # ESLint en todo el repo
npm run typecheck           # tsc en server y widget
npm run test:coverage       # tests con mínimo 80% de coverage (falla si baja)
npm run evals:offline       # evals de seguridad sin LLM
npm run dev:server          # server en :3001 (necesita server/.env)
npm run dev:widget          # widget en :5173
```

Antes de dar por terminado un cambio corré `npm run lint && npm run typecheck && npm run test:coverage && npm run evals:offline`.

## Reglas del código

- TypeScript estricto. Nada de `any`; si hace falta, `unknown` y validar.
- En el server los imports llevan `.js` (ESM NodeNext): `import { x } from "./y.js"`.
- Las dependencias externas (LLM, `fetch`, el opener del navegador) se inyectan por constructor para poder probarlas. En los tests no se llama a APIs reales: usá `ScriptedLLM` y `fakeFetch` de `server/src/utilidadesDePrueba/dobles.ts`, y `FakeSocket` de `widget/src/utilidadesDePrueba/socketFalso.ts`.
- Cada archivo nuevo en `src/` lleva su test. El coverage mínimo es 80% en líneas, ramas, funciones y statements.
- Comentarios y textos para el usuario en español. Butaca le habla al usuario con voseo.

## Mapa rápido

- `server/src/agentes/agenteBase.ts`: el ciclo de tool calling que usan todos los agentes.
- `server/src/agentes/sistemaMultiagente.ts`: arma el sistema; cada experto recibe solo sus tools con `toolbox.only([...])`.
- `server/src/agentes/delegarAExpertos.ts`: expone a los expertos como tools del orquestador.
- `server/src/agentes/promptsDeLosAgentes.ts`: los system prompts, con las reglas de seguridad comunes.
- `server/src/mcp/<servidor>/`: `clienteApi...` (REST), `servidorMcp...` (tools con zod) e `iniciarPorStdio.ts`.
- `server/src/seguridad/`: guardia de entrada, guardia de salida (canary + huellas del prompt), patrones de ataque y limpieza de datos de herramientas.
- `server/src/conversacion/servicioDeChat.ts`: entrada → agentes → salida → historial.
- `server/src/modeloIA/crearClienteLLM.ts`: escoge el adaptador del LLM (Groq o cualquier API compatible con OpenAI según `LLM_BASE_URL`).

## Cómo agregar cosas

- **Herramienta nueva:** creá `server/src/mcp/<nombre>/` con sus tres archivos, conectala en `MultiAgentSystem.create` y agregala al `only([...])` del agente que la use.
- **Agente nuevo:** escribí su prompt en `promptsDeLosAgentes.ts` usando `SECURITY_RULES(canary)`, registralo en el `DelegationExecutor` de `sistemaMultiagente.ts` y agregá su prompt a `systemPrompts()` para que la guardia de salida lo proteja.
- **Patrón de ataque nuevo:** va en `seguridad/patronesDeAtaque.ts`, con un test en `seguridad.test.ts` y un caso en `server/evals/casos/`. Revisá que `evals:offline` siga sin falsos positivos.
- **Componente nuevo del widget:** en `widget/src/componentes/`, con su `.test.tsx`.

## Seguridad (no romper)

- Nunca pongas secretos ni API keys en prompts, código o tests. Van en `server/.env`, que está en el `.gitignore`.
- No agregues dominios a `mcp/navegador/sitiosPermitidos.ts` ni a `widget/src/seguridadCliente.ts` sin justificarlo en el PR.
- No habilites HTML crudo en el widget (nada de `rehype-raw` ni `dangerouslySetInnerHTML`).
- `open_url` es solo del orquestador; no se la des a los expertos.

## Git

GitHub Flow: rama desde `main` (`feature/...`, `fix/...`, `docs/...`), PR con el CI en verde, revisión y merge. Commits con Conventional Commits.
