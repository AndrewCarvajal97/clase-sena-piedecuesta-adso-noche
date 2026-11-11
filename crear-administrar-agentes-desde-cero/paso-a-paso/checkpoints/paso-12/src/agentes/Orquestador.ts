import type { LLMProvider } from "../llm/types.js";
import { extraerJson } from "../util/json.js";
import type { Escucha } from "./eventos.js";
import { sintetizar } from "./PlanificadorAgent.js";
import type { ReActAgent } from "./ReActAgent.js";

/** Un especialista: un agente + una descripción para que el orquestador sepa cuándo usarlo. */
export interface Especialista {
  nombre: string;
  descripcion: string;
  agente: ReActAgent;
}

export interface Estadistica {
  ejecuciones: number;
  exitos: number;
  fallos: number;
  msTotal: number;
}

/**
 * NIVEL 5 — Sistema multi-agente con ORQUESTADOR.
 *
 *            ┌────────────── Orquestador ──────────────┐
 *            │  decide a QUIÉN delegar cada subtarea   │
 *            └───────┬──────────────┬──────────────────┘
 *              Investigador     Matemático   … (cada uno con SUS herramientas)
 *
 * Por qué varios agentes pequeños y no uno gigante:
 *   • cada uno tiene pocas herramientas → se confunde menos
 *   • prompts cortos y enfocados → más baratos y más precisos
 *   • puedes probar, medir y reemplazar cada especialista por separado
 *
 * Esta clase también es el ADMINISTRADOR: registra, ejecuta y mide a los agentes.
 */
export class Orquestador {
  private readonly especialistas = new Map<string, Especialista>();
  readonly estadisticas = new Map<string, Estadistica>();

  constructor(
    private readonly llm: LLMProvider,
    especialistas: Especialista[],
    private readonly escucha: Escucha = () => {},
  ) {
    especialistas.forEach((e) => this.registrar(e));
  }

  registrar(e: Especialista) {
    this.especialistas.set(e.nombre, e);
    this.estadisticas.set(e.nombre, { ejecuciones: 0, exitos: 0, fallos: 0, msTotal: 0 });
  }

  quitar(nombre: string) {
    this.especialistas.delete(nombre);
  }

  listar() {
    return [...this.especialistas.values()].map((e) => ({ nombre: e.nombre, descripcion: e.descripcion }));
  }

  private async delegar(d: { agente: string; tarea: string }): Promise<string> {
    const esp = this.especialistas.get(d.agente);
    if (!esp) return `Error: no existe el especialista "${d.agente}". Disponibles: ${[...this.especialistas.keys()].join(", ")}`;

    const est = this.estadisticas.get(d.agente)!;
    const t0 = Date.now();
    est.ejecuciones++;
    try {
      const r = await esp.agente.ejecutar(d.tarea);
      if (r.cortadoPorLimite) est.fallos++;
      else est.exitos++;
      return r.respuesta;
    } catch (e) {
      est.fallos++;
      return `Error del especialista: ${(e as Error).message}`;
    } finally {
      est.msTotal += Date.now() - t0;
    }
  }

  async ejecutar(tarea: string): Promise<{ respuesta: string; delegaciones: { agente: string; tarea: string; respuesta: string }[] }> {
    const catalogo = this.listar().map((e) => `- ${e.nombre}: ${e.descripcion}`).join("\n");
    const crudo = await this.llm.chat(
      [
        {
          rol: "system",
          contenido:
            `Eres un ORQUESTADOR. Reparte la tarea entre estos especialistas:\n${catalogo}\n\n` +
            'Responde SOLO con JSON: {"pensamiento": "...", "delegaciones": [{"agente": "nombre_exacto", "tarea": "subtarea clara y autocontenida"}]}',
        },
        { rol: "user", contenido: tarea },
      ],
      { json: true, temperatura: 0 },
    );

    const lista = extraerJson<{ delegaciones?: { agente: string; tarea: string }[] }>(crudo).delegaciones;
    if (!Array.isArray(lista) || !lista.length) throw new Error("El orquestador no delegó nada");

    const delegaciones: { agente: string; tarea: string; respuesta: string }[] = [];
    for (const [i, d] of lista.entries()) {
      this.escucha({ agente: "Orquestador", tipo: "delegacion", paso: i + 1, texto: `→ ${d.agente}: ${d.tarea}` });
      delegaciones.push({ ...d, respuesta: await this.delegar(d) });
    }

    const respuesta = await sintetizar(
      this.llm,
      tarea,
      delegaciones.map((d) => ({ paso: `${d.agente}: ${d.tarea}`, respuesta: d.respuesta })),
    );
    this.escucha({ agente: "Orquestador", tipo: "final", paso: lista.length + 1, texto: respuesta });
    return { respuesta, delegaciones };
  }

  /** Tablero de administración: ¿quién trabaja bien y quién falla? */
  tablero(): string {
    const filas = [...this.estadisticas.entries()].map(
      ([n, s]) => `  ${n.padEnd(14)} ejecuciones=${s.ejecuciones}  ok=${s.exitos}  fallos=${s.fallos}  tiempo=${s.msTotal}ms`,
    );
    return ["📋 Tablero de agentes:", ...filas].join("\n");
  }
}
