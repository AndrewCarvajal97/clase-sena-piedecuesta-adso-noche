/**
 * Una HERRAMIENTA es una función normal de TypeScript + una descripción en texto.
 * La descripción es lo que el LLM "lee" para decidir cuándo usarla.
 * (¡La descripción es tan importante como el código!)
 */
export interface Herramienta {
  /** Identificador sin espacios: el LLM escribirá este nombre para invocarla. */
  nombre: string;
  /** Qué hace y cuándo usarla. Sé claro y breve. */
  descripcion: string;
  /** Ejemplo del valor de "entrada" (ayuda a los modelos pequeños). */
  ejemploEntrada: string;
  ejecutar(entrada: string): Promise<string> | string;
}

/** Caja de herramientas de un agente. */
export class CajaDeHerramientas {
  private readonly mapa = new Map<string, Herramienta>();

  constructor(herramientas: Herramienta[] = []) {
    herramientas.forEach((h) => this.agregar(h));
  }

  agregar(h: Herramienta): this {
    this.mapa.set(h.nombre, h);
    return this;
  }

  tiene(nombre: string) {
    return this.mapa.has(nombre);
  }

  nombres() {
    return [...this.mapa.keys()];
  }

  /** Texto que se pega en el system prompt para que el LLM conozca las herramientas. */
  describir(): string {
    if (!this.mapa.size) return "(sin herramientas)";
    return [...this.mapa.values()]
      .map((h) => `- ${h.nombre}: ${h.descripcion} Ejemplo de entrada: "${h.ejemploEntrada}"`)
      .join("\n");
  }

  /** Ejecuta con red de seguridad: un error de la herramienta NUNCA debe tumbar al agente. */
  async ejecutar(nombre: string, entrada: string): Promise<string> {
    const h = this.mapa.get(nombre);
    if (!h) return `Error: la herramienta "${nombre}" no existe. Herramientas válidas: ${this.nombres().join(", ")}`;
    try {
      return String(await h.ejecutar(entrada));
    } catch (e) {
      return `Error al ejecutar "${nombre}": ${(e as Error).message}`;
    }
  }
}
