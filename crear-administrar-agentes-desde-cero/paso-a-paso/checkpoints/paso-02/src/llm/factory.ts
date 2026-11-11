import { env } from "../config.js";
import type { LLMProvider } from "./types.js";
import { MockProvider } from "./providers/mock.js";

export type NombreProveedor = "mock";

/**
 * FÁBRICA de estrategias: convierte un texto ("mock") en un objeto LLMProvider.
 * Es el ÚNICO lugar del proyecto que conoce las clases concretas.
 * El resto del código (los agentes) solo ve la interfaz LLMProvider.
 */
export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
  switch (nombre.toLowerCase()) {
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Por ahora solo existe: mock`);
  }
}
