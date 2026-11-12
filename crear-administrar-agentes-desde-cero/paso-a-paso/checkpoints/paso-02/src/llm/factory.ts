import { env } from "../config.js";
import type { LLMProvider } from "./types.js";
import { MockProvider } from "./providers/mock.js";

export type NombreProveedor = "mock";

const instancias = new Map<string, LLMProvider>();

/**
 * FÁBRICA + SINGLETON: crea el proveedor mock una sola vez por proceso.
 * El resto del código (los agentes) solo ve la interfaz LLMProvider.
 */
export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
  const claveCache = nombre.trim().toLowerCase();
  const existente = instancias.get(claveCache);
  if (existente) return existente;

  switch (claveCache) {
    case "mock": {
      const proveedor = new MockProvider();
      instancias.set(claveCache, proveedor);
      return proveedor;
    }
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Por ahora solo existe: mock`);
  }
}
