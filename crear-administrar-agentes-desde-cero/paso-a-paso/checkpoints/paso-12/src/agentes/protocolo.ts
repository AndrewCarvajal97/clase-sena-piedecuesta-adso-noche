import type { CajaDeHerramientas } from "../tools/herramienta.js";
import { extraerJson } from "../util/json.js";

/**
 * EL PROTOCOLO: cómo "hablamos" con el LLM para que use herramientas.
 * Le pedimos que responda SIEMPRE en JSON con uno de dos formatos.
 * Ventaja: funciona igual en Gemini, Cohere y Groq (sin depender del
 * "function calling" nativo de cada proveedor, que cambia entre ellos).
 */
export type DecisionLLM =
  | { tipo: "accion"; pensamiento: string; accion: string; entrada: string }
  | { tipo: "final"; pensamiento: string; respuesta: string };

export function promptProtocolo(rol: string, herramientas: CajaDeHerramientas, extra = ""): string {
  return `${rol}

HERRAMIENTAS DISPONIBLES:
${herramientas.describir()}

Responde SIEMPRE con UN solo objeto JSON válido, sin texto adicional. Hay dos formatos:

1) Cuando necesites una herramienta:
{"pensamiento": "por qué la necesito", "accion": "nombre_de_la_herramienta", "entrada": "texto de entrada"}

2) Cuando ya tengas la información para responder:
{"pensamiento": "por qué ya puedo responder", "respuesta_final": "respuesta clara para el usuario"}

REGLAS:
- Usa UNA herramienta por turno. Después recibirás un mensaje que empieza con "Observación:".
- No inventes datos: si no los tienes, usa una herramienta o dilo con honestidad.
- Si una herramienta devuelve un error, corrige la entrada o intenta otra forma.
- Responde en español.${extra ? "\n" + extra : ""}`;
}

/** Convierte el texto del LLM en una decisión tipada (o lanza error si el formato es inválido). */
export function interpretar(texto: string): DecisionLLM {
  const j = extraerJson<Record<string, unknown>>(texto);
  const pensamiento = typeof j.pensamiento === "string" ? j.pensamiento : "";

  if (typeof j.respuesta_final === "string") return { tipo: "final", pensamiento, respuesta: j.respuesta_final };
  if (typeof j.accion === "string") {
    return { tipo: "accion", pensamiento, accion: j.accion, entrada: j.entrada == null ? "" : String(j.entrada) };
  }
  throw new Error('El JSON no tiene ni "accion" ni "respuesta_final"');
}
