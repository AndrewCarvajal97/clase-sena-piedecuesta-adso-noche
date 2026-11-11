/**
 * NIVEL 4 — Plan-and-Execute: planificar primero, ejecutar después.
 *
 * Ejecuta:  npm run nivel4
 *           npm run nivel4 -- "Dime la hora, el clima en Cali y cuánto es 18 * 7"
 *
 * Diferencia clave con el Nivel 3: aquí HAY UN PLAN visible antes de actuar.
 * En un producto real podrías pedirle al usuario que apruebe el plan.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos, todasLasHerramientas } from "../bootstrap.js";
import { ReActAgent } from "../agentes/ReActAgent.js";
import { PlanificadorAgent } from "../agentes/PlanificadorAgent.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { titulo, verde, azul } from "../util/consola.js";

async function main() {
  const llm = crearLLM(60);
  titulo(`NIVEL 4 · Planificador · LLM: ${llm.nombre}`);

  const ejecutor = new ReActAgent({
    llm,
    herramientas: todasLasHerramientas(),
    rol: "Eres un ejecutor: resuelves UN paso concreto usando herramientas y respondes breve.",
    nombre: "Ejecutor",
    maxPasos: 4,
    escucha: imprimirEvento,
  });
  const agente = new PlanificadorAgent(llm, ejecutor, imprimirEvento);

  const tarea = preguntaDeArgumentos() || "Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * 7";
  console.log(`\n${azul("🎯 Tarea: " + tarea)}\n`);

  const r = await agente.ejecutar(tarea);
  console.log(`\n${verde("➡️  Respuesta final:")}\n${r.respuesta}`);
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
