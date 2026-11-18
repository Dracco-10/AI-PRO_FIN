import type { ToolDefinition } from "../modeloIA/tiposDelModelo.js";
import type { Agent, ExecutedToolCall } from "./agenteBase.js";
import type { ToolExecutor, ToolOutcome } from "./herramientasMcp.js";

export interface Expert {
  toolName: string;
  description: string;
  agent: Agent;
}

// los expertos se ven como tools del orquestador. Solo reciben la tarea, no el historial
export class DelegationExecutor implements ToolExecutor {
  readonly log: ExecutedToolCall[] = [];

  constructor(private readonly experts: Expert[]) {}

  definitions(): ToolDefinition[] {
    return this.experts.map((e) => ({
      name: e.toolName,
      description: e.description,
      parameters: {
        type: "object",
        properties: { task: { type: "string", description: "Tarea completa y autocontenida para el experto" } },
        required: ["task"]
      }
    }));
  }

  async call(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
    const expert = this.experts.find((e) => e.toolName === name);
    const task = typeof args.task === "string" ? args.task.trim() : "";
    if (!expert) return { text: JSON.stringify({ error: `Experto desconocido: ${name}` }), isError: true };
    if (!task) return { text: JSON.stringify({ error: "Falta la tarea (task)" }), isError: true };
    try {
      const result = await expert.agent.run([{ role: "user", content: task }]);
      this.log.push(...result.toolCalls);
      return { text: result.text, isError: false };
    } catch (err) {
      return { text: JSON.stringify({ error: (err as Error).message }), isError: true };
    }
  }
}
