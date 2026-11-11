/**
 * NIVEL 3 — Agente ReAct: Pensar → Actuar → Observar, en bucle.
 *
 * Ejecuta:  npm run nivel3
 *           npm run nivel3 -- "¿Qué clima hace en Cali y cuánto es 27 * 3?"
 *
 * Experimentos para la clase:
 *   1. Quita una herramienta de la caja y mira cómo reacciona.
 *   2. Baja maxPasos a 1 y observa el freno de emergencia.
 *   3. Cambia el rol del agente y compara el tono de la respuesta.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos, todasLasHerramientas } from "../bootstrap.js";
import { ReActAgent } from "../agentes/ReActAgent.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { titulo, verde, azul } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  titulo(`NIVEL 3 · Agente ReAct · LLM: ${llm.nombre}`);

  const agente = new ReActAgent({
    llm,
    herramientas: todasLasHerramientas(),
    rol: "Eres un asistente del SENA que resuelve preguntas paso a paso usando herramientas cuando hacen falta.",
    nombre: "ReAct",
    maxPasos: 6,
    escucha: imprimirEvento,
  });

  const personalizada = preguntaDeArgumentos();
  const preguntas = personalizada
    ? [personalizada]
    : [
        "¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?",
        "¿Qué es un token y cuánto es (1000 / 4) + 50?",
      ];

  for (const p of preguntas) {
    console.log(`\n${azul("❓ " + p)}`);
    const r = await agente.ejecutar(p);
    console.log(`${verde("➡️  Respuesta final:")} ${r.respuesta}`);
    console.log(`   pasos usados: ${r.pasos}${r.cortadoPorLimite ? " (cortado por límite)" : ""}`);
  }
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
