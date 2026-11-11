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

    const system = mensajes.filter((m) => m.rol === "system").map((m) => m.contenido).join(" ").toLowerCase();
    const resto = mensajes.filter((m) => m.rol !== "system");

    if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
    if (system.includes('"accion"')) return this.reaccionar(resto, system);
    return this.conversar(resto);
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

  // ---------- Protocolo de herramientas (niveles 2, 3 y especialistas) ----------
  private reaccionar(msgs: Mensaje[], system: string): string {
    // Solo la tarea: ignoramos el bloque de contexto de pasos anteriores.
    const pregunta = (msgs.find((m) => m.rol === "user")?.contenido ?? "").split("\n\n[Contexto")[0] ?? "";
    const observaciones = msgs
      .filter((m) => m.rol === "user" && m.contenido.startsWith("Observación:"))
      .map((m) => m.contenido.replace("Observación:", "").trim());

    // Solo considera las herramientas que el agente realmente tiene disponibles.
    const pendientes = this.herramientasNecesarias(pregunta).filter((h) => system.includes(`- ${h.nombre}:`));
    const siguiente = pendientes[observaciones.length];

    if (siguiente) {
      return JSON.stringify({
        pensamiento: `Necesito usar "${siguiente.nombre}" para avanzar.`,
        accion: siguiente.nombre,
        entrada: siguiente.entrada,
      });
    }
    const respuesta = observaciones.length
      ? `Con lo que obtuve: ${observaciones.join(" | ")}`
      : `No necesito herramientas para esto. (mock) Pregunta: ${pregunta.slice(0, 80)}`;
    return JSON.stringify({ pensamiento: "Ya tengo lo necesario para responder.", respuesta_final: respuesta });
  }

  private herramientasNecesarias(texto: string) {
    const hallazgos: { pos: number; nombre: string; entrada: string }[] = [];
    const clima = /clima|temperatura|llueve/i.exec(texto);
    if (clima) {
      hallazgos.push({ pos: clima.index, nombre: "clima", entrada: /\ben ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/.exec(texto)?.[1] ?? "Bogotá" });
    }
    // Expresión matemática: números, operadores y paréntesis (debe contener al menos un operador).
    const mat = [...texto.matchAll(/\(*\d[\d\s+\-*/^%().]*[\d)]/g)].find((m) => /[+\-*/^%]/.test(m[0]));
    if (mat) hallazgos.push({ pos: mat.index ?? 0, nombre: "calculadora", entrada: mat[0].trim() });
    const hora = /\bhora\b/i.exec(texto);
    if (hora) hallazgos.push({ pos: hora.index, nombre: "hora", entrada: "" });
    const def = /qu[eé] (?:es|son) (?:un |una |el |la |los |las )?(.+?)(?:\s+y\s|[?.,;]|$)/i.exec(texto);
    if (def) hallazgos.push({ pos: def.index, nombre: "buscar_conocimiento", entrada: def[1]!.trim() });
    return hallazgos.sort((a, b) => a.pos - b.pos);
  }
}
