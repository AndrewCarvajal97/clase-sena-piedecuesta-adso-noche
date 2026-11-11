import { amarillo, azul, gris, rojo, verde } from "../util/consola.js";

/**
 * TRAZABILIDAD: cada cosa que hace un agente emite un evento.
 * Con eventos puedes imprimir en consola, guardar en un archivo o mostrar en una web.
 */
export interface EventoAgente {
  agente: string;
  tipo: "pensamiento" | "accion" | "observacion" | "final" | "error" | "plan" | "delegacion";
  paso: number;
  texto: string;
}

export type Escucha = (e: EventoAgente) => void;

const ICONOS: Record<EventoAgente["tipo"], (t: string) => string> = {
  pensamiento: (t) => gris(`💭 ${t}`),
  accion: (t) => azul(`🛠️  ${t}`),
  observacion: (t) => amarillo(`👁️  ${t}`),
  final: (t) => verde(`✅ ${t}`),
  error: (t) => rojo(`⚠️  ${t}`),
  plan: (t) => azul(`📋 ${t}`),
  delegacion: (t) => azul(`📨 ${t}`),
};

/** Escucha lista para usar: imprime cada evento con colores. */
export const imprimirEvento: Escucha = (e) => {
  console.log(`  ${gris(`[${e.agente} · paso ${e.paso}]`)} ${ICONOS[e.tipo](e.texto)}`);
};
