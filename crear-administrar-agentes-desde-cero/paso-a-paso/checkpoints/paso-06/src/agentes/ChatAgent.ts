import type { LLMProvider } from "../llm/types.js";
import { MemoriaCompleta, type EstrategiaMemoria } from "./memoria.js";

/**
 * NIVEL 1 — Chatbot con rol y memoria.
 * Todavía NO es un agente (no decide acciones), pero ya tiene:
 *   • un system prompt (personalidad / reglas)
 *   • memoria (historial reenviado en cada turno)
 */
export class ChatAgent {
  constructor(
    private readonly llm: LLMProvider,
    private readonly systemPrompt: string,
    private readonly memoria: EstrategiaMemoria = new MemoriaCompleta(),
  ) {}

  async responder(texto: string): Promise<string> {
    await this.memoria.agregar({ rol: "user", contenido: texto });

    const respuesta = await this.llm.chat([
      { rol: "system", contenido: this.systemPrompt },
      ...this.memoria.obtener(),
    ]);

    await this.memoria.agregar({ rol: "assistant", contenido: respuesta });
    return respuesta;
  }

  /** ¿Cuántos mensajes se están reenviando? Útil para ver cómo crece el costo. */
  get mensajesEnMemoria() {
    return this.memoria.obtener().length;
  }
}
