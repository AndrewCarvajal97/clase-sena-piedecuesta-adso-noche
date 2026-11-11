import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";
import { postJson } from "../../util/http.js";

/** Estrategia #1 — Google Gemini (API REST, sin SDK). */
export class GeminiProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  ) {
    this.nombre = `gemini:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    // Gemini separa el "system" del resto y llama "model" al asistente.
    const system = mensajes.filter((m) => m.rol === "system").map((m) => m.contenido).join("\n\n");
    const contents = mensajes
      .filter((m) => m.rol !== "system")
      .map((m) => ({
        role: m.rol === "assistant" ? "model" : "user",
        parts: [{ text: m.contenido }],
      }));

    const cuerpo = {
      ...(system && { systemInstruction: { parts: [{ text: system }] } }),
      contents,
      generationConfig: {
        temperature: op.temperatura ?? 0.3,
        maxOutputTokens: op.maxTokens ?? 1024,
        ...(op.json && { responseMimeType: "application/json" }),
      },
    };

    const data = await postJson(
      this.nombre,
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:generateContent`,
      { "x-goog-api-key": this.apiKey },
      cuerpo,
    );

    const texto = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("");
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía o bloqueada por filtros de seguridad");
    return texto;
  }
}
