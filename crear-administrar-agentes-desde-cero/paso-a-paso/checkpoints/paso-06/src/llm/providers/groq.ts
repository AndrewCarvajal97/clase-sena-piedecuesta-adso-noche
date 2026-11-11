import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";
import { postJson } from "../../util/http.js";

/**
 * Estrategia #3 — Groq (hardware ultrarrápido, API compatible con OpenAI).
 * Dato útil: "compatible con OpenAI" significa que el mismo código sirve
 * para muchísimos otros proveedores cambiando solo la URL y la clave.
 */
export class GroqProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  ) {
    this.nombre = `groq:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    const cuerpo = {
      model: this.modelo,
      messages: mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
      temperature: op.temperatura ?? 0.3,
      max_tokens: op.maxTokens ?? 1024,
      ...(op.json && { response_format: { type: "json_object" } }),
    };

    const data = await postJson(
      this.nombre,
      "https://api.groq.com/openai/v1/chat/completions",
      { Authorization: `Bearer ${this.apiKey}` },
      cuerpo,
    );

    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía");
    return texto;
  }
}
