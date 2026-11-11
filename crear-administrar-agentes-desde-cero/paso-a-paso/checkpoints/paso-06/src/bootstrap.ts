import { LLMMedido } from "./llm/medido.js";
import { crearProveedor } from "./llm/factory.js";

/** LLM listo para usar: el que diga LLM_PROVIDER en .env, con métricas y tope de llamadas. */
export function crearLLM(maxLlamadas = 40) {
  return new LLMMedido(crearProveedor(), maxLlamadas);
}

/** Muestra un error de forma amigable (sin stack gigante) y termina. */
export function manejarErrorFatal(e: unknown): never {
  console.error(`\n❌ ${(e as Error).message}`);
  console.error("💡 Tip: usa LLM_PROVIDER=mock en .env para practicar sin claves ni internet.");
  process.exit(1);
}
