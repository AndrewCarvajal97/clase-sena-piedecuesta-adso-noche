import type { LLMProvider } from "../llm/types.js";
import { extraerJson } from "../util/json.js";
import type { Escucha } from "./eventos.js";
import type { ReActAgent } from "./ReActAgent.js";

export interface ResultadoPlan {
  plan: string[];
  resultados: { paso: string; respuesta: string }[];
  respuesta: string;
}

/** Une los resultados parciales en una respuesta final (usado por Nivel 4 y Nivel 5). */
export async function sintetizar(
  llm: LLMProvider,
  tarea: string,
  resultados: { paso: string; respuesta: string }[],
): Promise<string> {
  const datos = resultados.map((r, i) => `${i + 1}. ${r.paso} → ${r.respuesta}`).join("\n");
  return llm.chat([
    {
      rol: "system",
      contenido:
        "Eres un SINTETIZADOR. Con los resultados parciales, redacta una respuesta final clara y breve en español. " +
        "Usa SOLO los datos entregados; no inventes nada.",
    },
    { rol: "user", contenido: `Tarea original: ${tarea}\n\nResultados:\n${datos}` },
  ]);
}

/**
 * NIVEL 4 — Plan-and-Execute (planificar y luego ejecutar).
 *
 *   1) PLANIFICAR : un LLM divide la tarea en pasos.
 *   2) EJECUTAR   : un agente ReAct resuelve cada paso (con el contexto de los anteriores).
 *   3) SINTETIZAR : otro LLM une todo en una respuesta final.
 *
 * Ventaja sobre ReAct puro: en tareas largas el agente no se "pierde", porque
 * tiene un mapa (el plan) y puedes mostrarlo / aprobarlo antes de ejecutar.
 */
export class PlanificadorAgent {
  constructor(
    private readonly llm: LLMProvider,
    private readonly ejecutor: ReActAgent,
    private readonly escucha: Escucha = () => {},
    private readonly maxPasosPlan = 6,
  ) {}

  async planear(tarea: string): Promise<string[]> {
    const crudo = await this.llm.chat(
      [
        {
          rol: "system",
          contenido:
            "Eres un PLANIFICADOR. Divide la tarea del usuario en pasos cortos, concretos y en orden. " +
            `Máximo ${this.maxPasosPlan} pasos. Responde SOLO con JSON: {"pensamiento": "...", "pasos": ["paso 1", "paso 2"]}`,
        },
        { rol: "user", contenido: tarea },
      ],
      { json: true, temperatura: 0 },
    );
    const pasos = extraerJson<{ pasos?: unknown }>(crudo).pasos;
    if (!Array.isArray(pasos) || !pasos.length) throw new Error("El planificador no devolvió pasos");
    return pasos.map(String).slice(0, this.maxPasosPlan);
  }

  async ejecutar(tarea: string): Promise<ResultadoPlan> {
    const plan = await this.planear(tarea);
    this.escucha({ agente: "Planificador", tipo: "plan", paso: 0, texto: plan.map((p, i) => `${i + 1}) ${p}`).join("  ") });

    const resultados: ResultadoPlan["resultados"] = [];
    for (const [i, paso] of plan.entries()) {
      this.escucha({ agente: "Planificador", tipo: "delegacion", paso: i + 1, texto: `Ejecutando: ${paso}` });
      const contexto = resultados.map((r) => `- ${r.paso}: ${r.respuesta}`).join("\n");
      const r = await this.ejecutor.ejecutar(paso, contexto);
      resultados.push({ paso, respuesta: r.respuesta });
    }

    const respuesta = await sintetizar(this.llm, tarea, resultados);
    this.escucha({ agente: "Planificador", tipo: "final", paso: plan.length + 1, texto: respuesta });
    return { plan, resultados, respuesta };
  }
}
