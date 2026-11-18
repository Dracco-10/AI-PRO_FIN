import type { OpenMode } from "../configuracion.js";
import type { AttackCategory } from "../seguridad/patronesDeAtaque.js";
import { checkInput } from "../seguridad/guardiaDeEntrada.js";
import type { OutputGuard } from "../seguridad/guardiaDeSalida.js";
import type { TurnResult } from "../agentes/sistemaMultiagente.js";
import type { ChatMessage } from "../modeloIA/tiposDelModelo.js";
import type { SessionStore } from "./historialDeSesiones.js";

export interface ChatAction {
  type: "open_url";
  url: string;
}

export interface ChatReply {
  text: string;
  actions: ChatAction[];
  blocked?: { layer: "input" | "output"; category?: AttackCategory | "canary" | "prompt_leak" };
  toolCalls: TurnResult["toolCalls"];
}

export interface TurnRunner {
  runTurn(conversation: ChatMessage[]): Promise<TurnResult>;
}

export const ERROR_MESSAGE = "Se me trabó algo consultando mis fuentes, probá otra vez en un ratito 🙏";

// entrada -> agentes -> salida -> historial
export class ChatService {
  constructor(
    private readonly system: TurnRunner,
    private readonly outputGuard: OutputGuard,
    private readonly sessions: SessionStore,
    private readonly openMode: OpenMode = "server"
  ) {}

  async handle(sessionId: string, rawText: string): Promise<ChatReply> {
    const input = checkInput(rawText);
    if (!input.allowed) {
      return {
        text: input.message,
        actions: [],
        toolCalls: [],
        blocked: input.reason === "attack" ? { layer: "input", category: input.category } : undefined
      };
    }

    const history = this.sessions.get(sessionId);
    let turn: TurnResult;
    try {
      turn = await this.system.runTurn([...history, { role: "user", content: input.text }]);
    } catch (err) {
      console.error("[chat] error en el sistema multiagente:", (err as Error).message);
      return { text: ERROR_MESSAGE, actions: [], toolCalls: [] };
    }

    const output = this.outputGuard.check(turn.text);
    const text = output.text;
    this.sessions.append(sessionId, { role: "user", content: input.text }, { role: "assistant", content: text });

    return {
      text,
      actions: this.openMode === "client" ? extractActions(turn) : [],
      toolCalls: turn.toolCalls,
      blocked: output.allowed ? undefined : { layer: "output", category: output.reason }
    };
  }
}

export function extractActions(turn: TurnResult): ChatAction[] {
  return turn.toolCalls
    .filter((c) => c.name === "open_url" && !c.isError)
    .flatMap((c) => {
      try {
        const data = JSON.parse(c.result) as { opened?: boolean; url?: string };
        return data.opened && data.url ? [{ type: "open_url" as const, url: data.url }] : [];
      } catch {
        return [];
      }
    });
}
