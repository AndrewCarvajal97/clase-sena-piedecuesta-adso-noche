import type { LLMProvider, Mensaje } from "../llm/types.js";
import type { CajaDeHerramientas } from "../tools/herramienta.js";
import { interpretar, promptProtocolo } from "./protocolo.js";
import type { Escucha } from "./eventos.js";

/**
 * NIVEL 2 — Agente con herramientas (UNA sola vez).
 *   Pregunta → el LLM decide → se ejecuta UNA herramienta → el LLM redacta.
 * Es un agente "de un solo disparo": sirve para tareas simples,
 * pero falla si la pregunta necesita encadenar varias herramientas.
 */
export class ToolAgent {
  constructor(
    private readonly llm: LLMProvider,
    private readonly herramientas: CajaDeHerramientas,
    private readonly escucha: Escucha = () => {},
    private readonly nombre = "ToolAgent",
  ) {}

  async ejecutar(pregunta: string): Promise<string> {
    const system = promptProtocolo(
      "Eres un asistente útil.",
      this.herramientas,
      "- Solo puedes usar UNA herramienta en total para esta pregunta.",
    );
    const mensajes: Mensaje[] = [
      { rol: "system", contenido: system },
      { rol: "user", contenido: pregunta },
    ];

    // Llamada 1: ¿necesita herramienta?
    const crudo = await this.llm.chat(mensajes, { json: true, temperatura: 0 });
    const decision = interpretar(crudo);
    this.escucha({ agente: this.nombre, tipo: "pensamiento", paso: 1, texto: decision.pensamiento });

    if (decision.tipo === "final") return decision.respuesta;

    // Ejecutamos la herramienta (código normal, NO el LLM).
    this.escucha({ agente: this.nombre, tipo: "accion", paso: 1, texto: `${decision.accion}("${decision.entrada}")` });
    const observacion = await this.herramientas.ejecutar(decision.accion, decision.entrada);
    this.escucha({ agente: this.nombre, tipo: "observacion", paso: 1, texto: observacion });

    // Llamada 2: el LLM redacta la respuesta usando la observación.
    mensajes.push({ rol: "assistant", contenido: crudo }, { rol: "user", contenido: `Observación: ${observacion}` });
    const segunda = interpretar(await this.llm.chat(mensajes, { json: true, temperatura: 0 }));

    if (segunda.tipo === "final") return segunda.respuesta;
    // Quiso usar otra herramienta, pero este nivel no lo permite → límite del Nivel 2.
    return `(Nivel 2 solo usa una herramienta) Esto es lo que obtuve: ${observacion}`;
  }
}
