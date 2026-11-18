import Groq from "groq-sdk";
import type { ChatMessage, LLMClient, LLMResponse, ToolDefinition } from "./tiposDelModelo.js";

// solo la parte del SDK que usamos (así se puede meter un doble en los tests)
export interface GroqLike {
  chat: {
    completions: {
      create(body: Record<string, unknown>): Promise<{
        choices: Array<{
          message: {
            content?: string | null;
            tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
          };
        }>;
      }>;
    };
  };
}

export function toGroqMessages(messages: ChatMessage[]): Record<string, unknown>[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: "assistant",
        content: m.content,
        tool_calls: m.toolCalls.map((t) => ({
          id: t.id,
          type: "function",
          function: { name: t.name, arguments: JSON.stringify(t.arguments) }
        }))
      };
    }
    return { role: m.role, content: m.content };
  });
}

export function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export class GroqClient implements LLMClient {
  private readonly client: GroqLike;

  constructor(
    apiKey: string,
    private readonly model: string,
    client?: GroqLike
  ) {
    this.client = client ?? (new Groq({ apiKey }) as unknown as GroqLike);
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[] = []): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: toGroqMessages(messages),
      temperature: 0.3
    };
    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters }
      }));
      body.tool_choice = "auto";
    }
    let res;
    try {
      res = await this.client.chat.completions.create(body);
    } catch {
      // a veces el modelo arma mal una tool call (400 tool_use_failed), un reintento casi siempre lo arregla
      res = await this.client.chat.completions.create(body);
    }
    const msg = res.choices[0]?.message ?? {};
    return {
      content: msg.content ?? "",
      toolCalls: (msg.tool_calls ?? []).map((t) => ({
        id: t.id,
        name: t.function.name,
        arguments: parseArguments(t.function.arguments)
      }))
    };
  }
}
