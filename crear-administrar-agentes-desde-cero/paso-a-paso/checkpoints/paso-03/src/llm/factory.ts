import { env } from "../config.js";
import type { LLMProvider } from "./types.js";
import { GeminiProvider } from "./providers/gemini.js";
import { CohereProvider } from "./providers/cohere.js";
import { GroqProvider } from "./providers/groq.js";
import { MockProvider } from "./providers/mock.js";

export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock";

const instancias = new Map<string, LLMProvider>();

/**
 * FÁBRICA + SINGLETON por proveedor: convierte un texto ("groq") en un
 * LLMProvider y reutiliza la misma instancia durante toda la ejecución.
 * Es el ÚNICO lugar del proyecto que conoce las clases concretas.
 * El resto del código (los agentes) solo ve la interfaz LLMProvider.
 */
export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
  const claveCache = nombre.trim().toLowerCase();
  const existente = instancias.get(claveCache);
  if (existente) return existente;

  const clave = (variable: string) => {
    const k = env(variable);
    if (!k) throw new Error(`Falta ${variable} en tu archivo .env (o usa LLM_PROVIDER=mock para practicar sin claves)`);
    return k;
  };

  let proveedor: LLMProvider;
  switch (claveCache) {
    case "gemini":
      proveedor = new GeminiProvider(clave("GEMINI_API_KEY"));
      break;
    case "cohere":
      proveedor = new CohereProvider(clave("COHERE_API_KEY"));
      break;
    case "groq":
      proveedor = new GroqProvider(clave("GROQ_API_KEY"));
      break;
    case "mock":
      proveedor = new MockProvider();
      break;
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock`);
  }

  instancias.set(claveCache, proveedor);
  return proveedor;
}
