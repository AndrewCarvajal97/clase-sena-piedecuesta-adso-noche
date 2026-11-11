import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";
import { postJson } from "../../util/http.js";

/** Estrategia #2 — Cohere (API v2 /chat). */
export class CohereProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.COHERE_MODEL ?? "command-a-03-2025",
  ) {
    this.nombre = `cohere:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    // Cohere v2 acepta los roles system / user / assistant tal cual.
    const cuerpo = {
      model: this.modelo,
      messages: mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
      temperature: op.temperatura ?? 0.3,
      max_tokens: op.maxTokens ?? 1024,
      ...(op.json && { response_format: { type: "json_object" } }),
    };

    const data = await postJson(
      this.nombre,
      "https://api.cohere.com/v2/chat",
      { Authorization: `Bearer ${this.apiKey}` },
      cuerpo,
    );

    const texto = data?.message?.content?.map((c: any) => c.text ?? "").join("");
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía");
    return texto;
  }
}
