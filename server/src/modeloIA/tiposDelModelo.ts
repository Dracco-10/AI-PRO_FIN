// los agentes dependen de esto y no de Groq, así se puede cambiar de proveedor o usar uno falso en tests
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  // datos extra que algunos proveedores exigen que se les devuelvan tal cual (ej. thought_signature de Gemini 3)
  extra?: Record<string, unknown>;
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; content: string; toolCallId: string };

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
}

export interface LLMClient {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}
