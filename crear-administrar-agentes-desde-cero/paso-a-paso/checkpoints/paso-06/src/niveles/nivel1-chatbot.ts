/**
 * NIVEL 1 — Chatbot con rol (system prompt) y memoria intercambiable.
 *
 * Ejecuta:
 *   npm run nivel1                  → memoria completa
 *   npm run nivel1 -- ventana       → memoria de ventana (olvida lo antiguo)
 *   npm run nivel1 -- resumen       → memoria con resumen automático
 *   npm run nivel1 -- --demo        → conversación automática (sin teclear)
 *
 * Prueba: dile "me llamo X", habla de 4-5 cosas más y pregunta "¿cómo me llamo?"
 * con memoria 'ventana'. ¿Qué pasa? ¿Por qué?
 */
import "../config.js";
import { crearLLM, manejarErrorFatal } from "../bootstrap.js";
import { ChatAgent } from "../agentes/ChatAgent.js";
import { MemoriaCompleta, MemoriaResumen, MemoriaVentana, type EstrategiaMemoria } from "../agentes/memoria.js";
import { crearLector, titulo, gris, verde } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  const eleccion = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "completa";

  // ← STRATEGY en acción: elegimos la estrategia de memoria en tiempo de ejecución.
  const memoria: EstrategiaMemoria =
    eleccion === "ventana" ? new MemoriaVentana(4) : eleccion === "resumen" ? new MemoriaResumen(llm, 2) : new MemoriaCompleta();

  const bot = new ChatAgent(
    llm,
    "Eres 'Tutor SENA', un asistente amable que explica con ejemplos cortos y en español colombiano. Máximo 3 frases.",
    memoria,
  );

  titulo(`NIVEL 1 · Chatbot · LLM: ${llm.nombre} · memoria: ${memoria.nombre}`);

  if (process.argv.includes("--demo")) {
    for (const frase of ["Hola, me llamo Camila", "¿Qué es un token?", "¿Y un agente?", "Dime un dato curioso", "¿Cómo me llamo?"]) {
      console.log(`\n${verde("Tú:")} ${frase}`);
      console.log(`${verde("Bot:")} ${await bot.responder(frase)}`);
      console.log(gris(`   (mensajes enviados en memoria: ${bot.mensajesEnMemoria})`));
    }
    console.log("\n" + llm.resumen());
    return;
  }

  console.log(gris("Escribe 'salir' para terminar.\n"));
  const lector = crearLector();
  for (;;) {
    const texto = await lector.preguntar(verde("Tú: "));
    if (!texto) continue;
    if (texto.toLowerCase() === "salir") break;
    console.log(`${verde("Bot:")} ${await bot.responder(texto)}`);
    console.log(gris(`   (mensajes en memoria: ${bot.mensajesEnMemoria})`));
  }
  lector.cerrar();
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
