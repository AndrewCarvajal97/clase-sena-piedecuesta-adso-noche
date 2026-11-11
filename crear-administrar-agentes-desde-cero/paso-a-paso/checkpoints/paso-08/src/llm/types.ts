/**
 * ============================================================
 *  PATRÓN STRATEGY — la interfaz común de TODOS los LLM
 * ============================================================
 *  Idea: el agente NO sabe si habla con Gemini, Cohere o Groq.
 *  Solo sabe que existe algo con un método `chat()`.
 *  Cada proveedor es una "estrategia" intercambiable.
 */

/** Quién habla en la conversación. */
export type Rol = "system" | "user" | "assistant";

/** Un mensaje de la conversación. */
export interface Mensaje {
  rol: Rol;
  contenido: string;
}

/** Opciones que casi todos los LLM entienden. */
export interface OpcionesChat {
  /** 0 = muy predecible, 1 = más creativo. */
  temperatura?: number;
  /** Límite de tokens de la respuesta. */
  maxTokens?: number;
  /** Pedirle al modelo que responda SOLO JSON (si el proveedor lo soporta). */
  json?: boolean;
}

/** Contrato que cumple cada estrategia (Gemini, Cohere, Groq, Mock…). */
export interface LLMProvider {
  /** Nombre legible, útil para logs y comparaciones. */
  readonly nombre: string;
  /** Recibe la conversación y devuelve el TEXTO de la respuesta. */
  chat(mensajes: Mensaje[], opciones?: OpcionesChat): Promise<string>;
}

/** Error propio para distinguir fallos de red / API del resto. */
export class ErrorLLM extends Error {
  constructor(
    public readonly proveedor: string,
    mensaje: string,
    public readonly status?: number,
  ) {
    super(`[${proveedor}] ${mensaje}`);
    this.name = "ErrorLLM";
  }
}
