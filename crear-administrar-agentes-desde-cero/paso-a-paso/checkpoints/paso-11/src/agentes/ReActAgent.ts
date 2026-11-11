import type { LLMProvider, Mensaje } from "../llm/types.js";
import type { CajaDeHerramientas } from "../tools/herramienta.js";
import { interpretar, promptProtocolo } from "./protocolo.js";
import type { Escucha, EventoAgente } from "./eventos.js";

export interface ResultadoAgente {
  respuesta: string;
  /** Cuántas vueltas del bucle se usaron. */
  pasos: number;
  /** true si se cortó por llegar al máximo de pasos (no por terminar bien). */
  cortadoPorLimite: boolean;
  eventos: EventoAgente[];
}

export interface OpcionesReAct {
  llm: LLMProvider;
  herramientas: CajaDeHerramientas;
  /** Personalidad y misión del agente (va al system prompt). */
  rol: string;
  nombre?: string;
  /** Freno de emergencia contra bucles infinitos. */
  maxPasos?: number;
  escucha?: Escucha;
}

/**
 * NIVEL 3 — Agente ReAct (Reason + Act).
 *
 *     ┌──────────────────────────────────────────┐
 *     │  1. PENSAR   ¿qué necesito saber/hacer?  │
 *     │  2. ACTUAR   llamar una herramienta      │
 *     │  3. OBSERVAR leer el resultado           │
 *     └───────── repetir hasta tener respuesta ──┘
 *
 * El LLM es el "cerebro" que decide; NUESTRO CÓDIGO es el "cuerpo" que ejecuta.
 */
export class ReActAgent {
  readonly nombre: string;
  private readonly maxPasos: number;

  constructor(private readonly op: OpcionesReAct) {
    this.nombre = op.nombre ?? "ReAct";
    this.maxPasos = op.maxPasos ?? 6;
  }

  async ejecutar(tarea: string, contexto = ""): Promise<ResultadoAgente> {
    const eventos: EventoAgente[] = [];
    const emitir = (paso: number, tipo: EventoAgente["tipo"], texto: string) => {
      const e = { agente: this.nombre, tipo, paso, texto };
      eventos.push(e);
      this.op.escucha?.(e);
    };

    const mensajes: Mensaje[] = [
      { rol: "system", contenido: promptProtocolo(this.op.rol, this.op.herramientas) },
      { rol: "user", contenido: contexto ? `${tarea}\n\n[Contexto de pasos anteriores]\n${contexto}` : tarea },
    ];
    const accionesHechas = new Set<string>();

    for (let paso = 1; paso <= this.maxPasos; paso++) {
      const crudo = await this.op.llm.chat(mensajes, { json: true, temperatura: 0 });

      // --- Defensa 1: el LLM no respondió con el formato esperado ---
      let decision;
      try {
        decision = interpretar(crudo);
      } catch (e) {
        emitir(paso, "error", `Formato inválido (${(e as Error).message}). Se le pide corregir.`);
        mensajes.push(
          { rol: "assistant", contenido: crudo },
          { rol: "user", contenido: 'Error de formato: responde SOLO con un objeto JSON con "accion" o "respuesta_final".' },
        );
        continue;
      }

      emitir(paso, "pensamiento", decision.pensamiento);

      if (decision.tipo === "final") {
        emitir(paso, "final", decision.respuesta);
        return { respuesta: decision.respuesta, pasos: paso, cortadoPorLimite: false, eventos };
      }

      // --- Defensa 2: detectar que el agente repite lo mismo (bucle) ---
      const huella = `${decision.accion}::${decision.entrada}`;
      let observacion: string;
      if (accionesHechas.has(huella)) {
        observacion = "Ya ejecutaste exactamente esa acción. No la repitas: usa lo que ya sabes o cambia de enfoque.";
        emitir(paso, "error", `Acción repetida: ${huella}`);
      } else {
        accionesHechas.add(huella);
        emitir(paso, "accion", `${decision.accion}("${decision.entrada}")`);
        observacion = await this.op.herramientas.ejecutar(decision.accion, decision.entrada);
        emitir(paso, "observacion", observacion);
      }

      mensajes.push({ rol: "assistant", contenido: crudo }, { rol: "user", contenido: `Observación: ${observacion}` });
    }

    // --- Defensa 3: freno de emergencia ---
    const aviso = `No pude terminar en ${this.maxPasos} pasos. Última información: ${mensajes.at(-1)?.contenido ?? ""}`;
    emitir(this.maxPasos, "error", "Límite de pasos alcanzado");
    return { respuesta: aviso, pasos: this.maxPasos, cortadoPorLimite: true, eventos };
  }
}
