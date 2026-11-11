import { LLMMedido } from "./llm/medido.js";
import { crearProveedor } from "./llm/factory.js";
import { CajaDeHerramientas } from "./tools/herramienta.js";
import { calculadora } from "./tools/calculadora.js";
import { buscarConocimiento, clima, hora } from "./tools/basicas.js";

/** LLM listo para usar: el que diga LLM_PROVIDER en .env, con métricas y tope de llamadas. */
export function crearLLM(maxLlamadas = 40) {
  return new LLMMedido(crearProveedor(), maxLlamadas);
}

/** Caja con TODAS las herramientas de la clase. */
export const todasLasHerramientas = () => new CajaDeHerramientas([calculadora, hora, clima, buscarConocimiento]);

/** Texto pasado por la terminal: `npm run nivel3 -- "tu pregunta"` */
export const preguntaDeArgumentos = () => process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ").trim();

/** Muestra un error de forma amigable (sin stack gigante) y termina. */
export function manejarErrorFatal(e: unknown): never {
  console.error(`\n❌ ${(e as Error).message}`);
  console.error("💡 Tip: usa LLM_PROVIDER=mock en .env para practicar sin claves ni internet.");
  process.exit(1);
}
