import { parseArguments, toGroqMessages } from "./clienteGroq.js";
import type { ChatMessage, LLMClient, LLMResponse, ToolDefinition } from "./tiposDelModelo.js";

// adaptador para cualquier proveedor con API compatible con OpenAI (Cerebras, OpenRouter, el mismo Groq...).
// cumple la misma interfaz LLMClient que clienteGroq, así que los agentes no se enteran del cambio
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface RespuestaApi {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string }; extra_content?: Record<string, unknown> }>;
    };
  }>;
}

// algunos proveedores (Gemini, por ejemplo) rechazan campos de JSON Schema que Groq sí acepta
// ($schema, additionalProperties, exclusiveMinimum, format: uri...). Se deja solo lo básico.
const CAMPOS_PERMITIDOS = new Set(["type", "description", "properties", "required", "items", "enum", "minimum", "maximum", "minLength", "maxLength", "nullable"]);

export function limpiarEsquema(esquema: unknown): unknown {
  if (Array.isArray(esquema)) return esquema.map(limpiarEsquema);
  if (typeof esquema !== "object" || esquema === null) return esquema;
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(esquema)) {
    if (!CAMPOS_PERMITIDOS.has(clave)) continue;
    if (clave === "properties" && typeof valor === "object" && valor !== null) {
      limpio.properties = Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiarEsquema(v)]));
    } else {
      limpio[clave] = limpiarEsquema(valor);
    }
  }
  return limpio;
}

export class ErrorDelProveedor extends Error {
  constructor(
    readonly status: number,
    detalle: string
  ) {
    super(`${status} ${detalle}`);
  }
}

export class OpenAICompatibleClient implements LLMClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
    private readonly maxReintentos = 4
  ) {}

  // LLM_MODEL puede ser una lista separada por comas: si un modelo está saturado (5xx) o la red falla,
  // se pasa al siguiente. Así un pico de demanda del proveedor no tumba el chat.
  get modelos(): string[] {
    return this.model.split(",").map((m) => m.trim()).filter(Boolean);
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[] = []): Promise<LLMResponse> {
    const modelos = this.modelos;
    const base: Record<string, unknown> = { messages: toGroqMessages(messages), temperature: 0.3 };
    if (tools.length > 0) {
      base.tools = tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: limpiarEsquema(t.parameters) }
      }));
      base.tool_choice = "auto";
    }

    let actual = 0;
    for (let intento = 0; ; intento++) {
      let res: Response;
      try {
        res = await this.fetchFn(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, model: modelos[actual] })
        });
      } catch (err) {
        // error de red ("fetch failed"): se trata igual que un servidor caído
        res = new Response((err as Error).message, { status: 599 });
      }
      if (res.ok) {
        const data = (await res.json()) as RespuestaApi;
        const msg = data.choices?.[0]?.message ?? {};
        return {
          content: msg.content ?? "",
          toolCalls: (msg.tool_calls ?? []).map((t) => ({
            id: t.id,
            name: t.function.name,
            arguments: parseArguments(t.function.arguments),
            ...(t.extra_content ? { extra: t.extra_content } : {})
          }))
        };
      }
      const caido = res.status >= 500;
      // si el modelo está caído y hay otro en la lista, se cambia de una vez sin esperar
      if (caido && actual < modelos.length - 1) {
        actual++;
        continue;
      }
      // 429 = límite por minuto: se espera y se reintenta. Un 400 suele ser una tool call mal armada:
      // un reintento casi siempre lo arregla
      const reintentable = res.status === 429 || (res.status === 400 && intento === 0) || caido;
      if (!reintentable || intento >= this.maxReintentos + (caido ? modelos.length - 1 : 0)) {
        throw new ErrorDelProveedor(res.status, (await res.text()).slice(0, 300));
      }
      if (caido) actual = 0; // se vuelve a probar desde el primero después de esperar
      const segundos = Number(res.headers.get("retry-after")) || 5 * (intento + 1);
      await this.esperar(Math.min(segundos, 30) * 1000);
    }
  }
}
