/**
 * SOLUCIÓN del reto "Nueva estrategia": un LLM LOCAL con Ollama (https://ollama.com).
 * Ollama expone una API compatible con OpenAI en http://localhost:11434/v1, así que el código
 * es casi idéntico al de Groq. ¡Esa es la gracia de Strategy: una clase nueva, cero cambios en los agentes!
 *
 * Cómo usarla: instala Ollama, ejecuta `ollama pull llama3.2` y en factory.ts añade:
 *     case "ollama": return new OllamaProvider();
 */
import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../llm/types.js";
import { postJson } from "../util/http.js";

export class OllamaProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly modelo = process.env.OLLAMA_MODEL ?? "llama3.2",
    private readonly baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434/v1",
  ) {
    this.nombre = `ollama:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    const data = await postJson(
      this.nombre,
      `${this.baseUrl}/chat/completions`,
      {}, // local: no necesita clave
      {
        model: this.modelo,
        messages: mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
        temperature: op.temperatura ?? 0.3,
        max_tokens: op.maxTokens ?? 1024,
        ...(op.json && { response_format: { type: "json_object" } }),
      },
      { timeoutMs: 120_000 }, // los modelos locales pueden tardar más
    );

    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía");
    return texto;
  }
}
