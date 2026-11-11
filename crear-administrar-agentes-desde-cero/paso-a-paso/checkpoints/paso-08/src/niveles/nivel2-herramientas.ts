/**
 * NIVEL 2 — Agente con herramientas (una sola herramienta por pregunta).
 *
 * Ejecuta:  npm run nivel2
 *           npm run nivel2 -- "¿Cuánto es 15% de 2400?"
 *
 * Observa la 3.ª pregunta: necesita DOS herramientas (clima + calculadora)
 * y este nivel solo puede usar una. ¡Ese es su límite! → el Nivel 3 lo resuelve.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos, todasLasHerramientas } from "../bootstrap.js";
import { ToolAgent } from "../agentes/ToolAgent.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { titulo, verde, azul } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  const agente = new ToolAgent(llm, todasLasHerramientas(), imprimirEvento, "Nivel2");
  titulo(`NIVEL 2 · Agente con herramientas · LLM: ${llm.nombre}`);

  const personalizada = preguntaDeArgumentos();
  const preguntas = personalizada
    ? [personalizada]
    : ["¿Qué hora es en Colombia?", "¿Cuánto es (12 + 8) * 3?", "¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?"];

  for (const p of preguntas) {
    console.log(`\n${azul("❓ " + p)}`);
    console.log(`${verde("➡️  Respuesta:")} ${await agente.ejecutar(p)}`);
  }
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
