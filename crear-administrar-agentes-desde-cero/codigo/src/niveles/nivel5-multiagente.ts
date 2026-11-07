/**
 * NIVEL 5 — Multi-agente: un Orquestador reparte el trabajo entre especialistas.
 *
 * Ejecuta:  npm run nivel5
 *           npm run nivel5 -- "¿Qué es RAG y cuánto es 144 / 12?"
 *
 * Fíjate en el tablero final: así se "administra" un equipo de agentes.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos } from "../bootstrap.js";
import { ReActAgent } from "../agentes/ReActAgent.js";
import { Orquestador } from "../agentes/Orquestador.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { CajaDeHerramientas } from "../tools/herramienta.js";
import { calculadora } from "../tools/calculadora.js";
import { buscarConocimiento, clima, hora } from "../tools/basicas.js";
import { titulo, verde, azul } from "../util/consola.js";

async function main() {
  const llm = crearLLM(80);
  titulo(`NIVEL 5 · Multi-agente · LLM: ${llm.nombre}`);

  // Cada especialista ve SOLO sus herramientas → menos confusión, más seguridad.
  const investigador = new ReActAgent({
    llm,
    nombre: "Investigador",
    rol: "Eres el Investigador: respondes preguntas de conocimiento, clima y hora con datos de tus herramientas.",
    herramientas: new CajaDeHerramientas([buscarConocimiento, clima, hora]),
    maxPasos: 4,
    escucha: imprimirEvento,
  });
  const matematico = new ReActAgent({
    llm,
    nombre: "Matematico",
    rol: "Eres el Matemático: resuelves cálculos con la calculadora, nunca de memoria.",
    herramientas: new CajaDeHerramientas([calculadora]),
    maxPasos: 3,
    escucha: imprimirEvento,
  });

  const jefe = new Orquestador(
    llm,
    [
      { nombre: "investigador", descripcion: "Conocimiento de IA, clima de ciudades y hora actual.", agente: investigador },
      { nombre: "matematico", descripcion: "Cualquier cálculo numérico.", agente: matematico },
    ],
    imprimirEvento,
  );

  const tarea = preguntaDeArgumentos() || "¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?";
  console.log(`\n${azul("🎯 Tarea: " + tarea)}\n`);

  const r = await jefe.ejecutar(tarea);
  console.log(`\n${verde("➡️  Respuesta final:")}\n${r.respuesta}`);
  console.log("\n" + jefe.tablero());
  console.log(llm.resumen());
}

main().catch(manejarErrorFatal);
