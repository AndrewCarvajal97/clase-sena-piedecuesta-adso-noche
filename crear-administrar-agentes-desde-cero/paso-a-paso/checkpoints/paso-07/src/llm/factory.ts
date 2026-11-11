import { env } from "../config.js";
import type { LLMProvider } from "./types.js";
import { GeminiProvider } from "./providers/gemini.js";
import { CohereProvider } from "./providers/cohere.js";
import { GroqProvider } from "./providers/groq.js";
import { MockProvider } from "./providers/mock.js";
import { FallbackProvider } from "./providers/fallback.js";

export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock" | "fallback";

/**
 * FÁBRICA de estrategias: convierte un texto ("groq") en un objeto LLMProvider.
 * Es el ÚNICO lugar del proyecto que conoce las clases concretas.
 * El resto del código (los agentes) solo ve la interfaz LLMProvider.
 */
export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
  const clave = (variable: string) => {
    const k = env(variable);
    if (!k) throw new Error(`Falta ${variable} en tu archivo .env (o usa LLM_PROVIDER=mock para practicar sin claves)`);
    return k;
  };

  switch (nombre.toLowerCase()) {
    case "gemini":
      return new GeminiProvider(clave("GEMINI_API_KEY"));
    case "cohere":
      return new CohereProvider(clave("COHERE_API_KEY"));
    case "groq":
      return new GroqProvider(clave("GROQ_API_KEY"));
    case "mock":
      return new MockProvider();
    case "fallback": {
      const orden = (env("FALLBACK_ORDER") ?? "groq,gemini,cohere").split(",").map((s) => s.trim());
      // Solo incluimos los proveedores que SÍ tienen clave configurada.
      const disponibles: LLMProvider[] = [];
      for (const n of orden) {
        try {
          disponibles.push(crearProveedor(n));
        } catch {
          /* sin clave: se omite */
        }
      }
      if (!disponibles.length) throw new Error("fallback: no hay ninguna clave configurada en .env");
      return new FallbackProvider(disponibles);
    }
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock | fallback`);
  }
}
