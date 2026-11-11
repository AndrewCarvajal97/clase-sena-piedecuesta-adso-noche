import type { LLMProvider, Mensaje } from "../llm/types.js";

/**
 * SEGUNDO PATRÓN STRATEGY de la clase: la MEMORIA.
 * Un LLM no recuerda nada entre llamadas: tú le reenvías el historial.
 * ¿Cuánto historial reenviar? Esa decisión es intercambiable → Strategy.
 */
export interface EstrategiaMemoria {
  readonly nombre: string;
  agregar(m: Mensaje): Promise<void> | void;
  /** Mensajes que se enviarán al LLM (sin el system prompt). */
  obtener(): Mensaje[];
  limpiar(): void;
}

/** Guarda TODO. Simple, pero crece sin límite (más tokens = más caro y más lento). */
export class MemoriaCompleta implements EstrategiaMemoria {
  readonly nombre = "completa";
  protected historial: Mensaje[] = [];
  agregar(m: Mensaje) { this.historial.push(m); }
  obtener() { return [...this.historial]; }
  limpiar() { this.historial = []; }
}

/** Solo recuerda los últimos N mensajes (ventana deslizante). Barata, pero olvida lo antiguo. */
export class MemoriaVentana implements EstrategiaMemoria {
  readonly nombre: string;
  private historial: Mensaje[] = [];
  constructor(private readonly maxMensajes = 6) {
    this.nombre = `ventana(${maxMensajes})`;
  }
  agregar(m: Mensaje) {
    this.historial.push(m);
    if (this.historial.length > this.maxMensajes) this.historial = this.historial.slice(-this.maxMensajes);
  }
  obtener() { return [...this.historial]; }
  limpiar() { this.historial = []; }
}

/** Cuando el historial se alarga, le pide al propio LLM que lo resuma. Equilibrio calidad/costo. */
export class MemoriaResumen implements EstrategiaMemoria {
  readonly nombre = "resumen";
  private resumen = "";
  private reciente: Mensaje[] = [];

  constructor(private readonly llm: LLMProvider, private readonly mantener = 4) {}

  async agregar(m: Mensaje) {
    this.reciente.push(m);
    if (this.reciente.length > this.mantener * 2) {
      const viejos = this.reciente.splice(0, this.reciente.length - this.mantener);
      const texto = viejos.map((x) => `${x.rol}: ${x.contenido}`).join("\n");
      this.resumen = await this.llm.chat([
        { rol: "system", contenido: "Eres un resumidor. Resume la conversación conservando nombres, datos y decisiones. Máximo 80 palabras." },
        { rol: "user", contenido: `Resumen previo: ${this.resumen || "(ninguno)"}\n\nNueva conversación:\n${texto}` },
      ]);
    }
  }

  obtener(): Mensaje[] {
    const base: Mensaje[] = this.resumen
      ? [{ rol: "user", contenido: `[Resumen de la conversación anterior]: ${this.resumen}` }, { rol: "assistant", contenido: "Entendido, tengo ese contexto." }]
      : [];
    return [...base, ...this.reciente];
  }
  limpiar() { this.resumen = ""; this.reciente = []; }
}
