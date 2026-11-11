import type { LLMProvider, Mensaje, OpcionesChat } from "./types.js";

/** Estimación rápida: ~4 caracteres ≈ 1 token (suficiente para controlar costos en clase). */
export const estimarTokens = (t: string) => Math.ceil(t.length / 4);

/**
 * Patrón DECORATOR: envuelve cualquier proveedor y le agrega métricas
 * (llamadas, tokens estimados, tiempo) sin modificar el proveedor original.
 * Esto es "administrar" agentes: lo que no se mide, no se controla.
 */
export class LLMMedido implements LLMProvider {
  llamadas = 0;
  tokensEntrada = 0;
  tokensSalida = 0;
  msTotal = 0;
  errores = 0;

  constructor(
    private readonly interno: LLMProvider,
    /** Tope de llamadas: protege tu cuota y tu bolsillo de un agente descontrolado. */
    private readonly maxLlamadas = Infinity,
  ) {}

  get nombre() {
    return this.interno.nombre;
  }

  async chat(mensajes: Mensaje[], op?: OpcionesChat): Promise<string> {
    if (this.llamadas >= this.maxLlamadas) {
      throw new Error(`Presupuesto agotado: máximo ${this.maxLlamadas} llamadas al LLM`);
    }
    this.llamadas++;
    this.tokensEntrada += estimarTokens(mensajes.map((m) => m.contenido).join(""));
    const t0 = Date.now();
    try {
      const r = await this.interno.chat(mensajes, op);
      this.tokensSalida += estimarTokens(r);
      return r;
    } catch (e) {
      this.errores++;
      throw e;
    } finally {
      this.msTotal += Date.now() - t0;
    }
  }

  resumen(): string {
    return `📊 ${this.llamadas} llamadas · ~${this.tokensEntrada} tokens in / ~${this.tokensSalida} out · ${this.msTotal} ms · ${this.errores} errores`;
  }
}
