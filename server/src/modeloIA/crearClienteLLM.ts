import type { LLMConfig } from "../configuracion.js";
import { GroqClient } from "./clienteGroq.js";
import { OpenAICompatibleClient } from "./clienteOpenAICompatible.js";
import type { LLMClient } from "./tiposDelModelo.js";

// escoge el adaptador según la configuración; el resto del sistema solo ve un LLMClient
export function crearClienteLLM(config: LLMConfig): LLMClient {
  return config.baseUrl
    ? new OpenAICompatibleClient(config.baseUrl, config.apiKey, config.model)
    : new GroqClient(config.apiKey, config.model);
}
