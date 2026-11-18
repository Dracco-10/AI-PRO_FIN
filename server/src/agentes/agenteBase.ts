import type { ChatMessage, LLMClient } from "../modeloIA/tiposDelModelo.js";
import { sanitizeToolOutput } from "../seguridad/limpiarDatosDeHerramientas.js";
import type { ToolExecutor } from "./herramientasMcp.js";

export interface ExecutedToolCall {
  agent: string;
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  isError: boolean;
}

export interface AgentResult {
  text: string;
  toolCalls: ExecutedToolCall[];
}

export const SIN_RESPUESTA = "No logré terminar esa búsqueda, ¿me lo preguntás de otra forma?";

// ciclo de tool calling: pedirle al LLM, ejecutar las tools que pida, devolverle el resultado, repetir
export class Agent {
  constructor(
    readonly name: string,
    private readonly llm: LLMClient,
    private readonly systemPrompt: string,
    private readonly tools: ToolExecutor,
    private readonly maxSteps = 10
  ) {}

  async run(conversation: ChatMessage[]): Promise<AgentResult> {
    const messages: ChatMessage[] = [{ role: "system", content: this.systemPrompt }, ...conversation];
    const executed: ExecutedToolCall[] = [];
    const definitions = this.tools.definitions();

    for (let step = 0; step < this.maxSteps; step++) {
      const res = await this.llm.chat(messages, definitions);
      if (res.toolCalls.length === 0) {
        return { text: res.content, toolCalls: executed };
      }
      messages.push({ role: "assistant", content: res.content, toolCalls: res.toolCalls });
      for (const call of res.toolCalls) {
        const outcome = await this.tools.call(call.name, call.arguments);
        executed.push({
          agent: this.name,
          name: call.name,
          arguments: call.arguments,
          result: outcome.text,
          isError: outcome.isError
        });
        messages.push({ role: "tool", toolCallId: call.id, content: sanitizeToolOutput(outcome.text) });
      }
    }
    // se acabaron los pasos: en vez de rendirse, se le pide que conteste con lo que ya encontró (sin más tools)
    return { text: await this.cerrarConLoQueHay(messages), toolCalls: executed };
  }

  private async cerrarConLoQueHay(messages: ChatMessage[]): Promise<string> {
    try {
      const res = await this.llm.chat([
        ...messages,
        { role: "system", content: "Ya no podés usar más herramientas. Respondé ahora con la información que ya obtuviste." }
      ]);
      if (res.content.trim()) return res.content;
    } catch {
      // si también falla, cae al mensaje de abajo
    }
    return SIN_RESPUESTA;
  }
}
