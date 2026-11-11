import { ErrorLLM, type LLMProvider, type Mensaje } from "../types.js";
import { dormir } from "../../util/http.js";

interface OpcionesMock {
  /** Simula una caída del proveedor (para practicar el fallback). */
  fallar?: boolean;
  /** Latencia artificial en milisegundos. */
  latenciaMs?: number;
  /** Nombre visible (útil cuando creas varios mocks). */
  etiqueta?: string;
}

/**
 * Estrategia #4 — Mock: un "LLM falso" que funciona SIN internet y SIN claves.
 * No es inteligente: usa reglas simples y reconoce el protocolo de nuestros agentes.
 * Sirve para: practicar sin gastar cuota, hacer pruebas y entender el flujo.
 */
export class MockProvider implements LLMProvider {
  readonly nombre: string;
  constructor(private readonly op: OpcionesMock = {}) {
    this.nombre = op.etiqueta ?? "mock";
  }

  async chat(mensajes: Mensaje[]): Promise<string> {
    if (this.op.fallar) throw new ErrorLLM(this.nombre, "Fallo simulado (503 servicio no disponible)", 503);
    if (this.op.latenciaMs) await dormir(this.op.latenciaMs);

    return this.conversar(mensajes);
  }

  // ---------- Conversación normal (niveles 0 y 1) ----------
  private conversar(msgs: Mensaje[]): string {
    const ultimo = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
    if (/c[oó]mo me llamo|cu[aá]l es mi nombre/i.test(ultimo)) {
      const dicho = msgs
        .map((m) => /(?:me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+)/i.exec(m.contenido)?.[1])
        .filter(Boolean)
        .at(-1);
      return dicho
        ? `Te llamas ${dicho}. ¡Lo recuerdo porque está en el historial que me enviaron!`
        : "No lo sé: no está en el historial que recibí.";
    }
    if (/\bhola\b|buenas/i.test(ultimo)) return "¡Hola! Soy un LLM simulado (mock). Cambia LLM_PROVIDER en .env para hablar con uno real.";
    return `(mock) Recibí ${msgs.length} mensaje(s). Tu último mensaje fue: "${ultimo.slice(0, 80)}"`;
  }
}
