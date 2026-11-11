/**
 * NIVEL 0 — Una llamada simple a un LLM (todavía NO es un agente).
 * Objetivo: ver con tus ojos que un LLM es una FUNCIÓN SIN MEMORIA:
 *   texto entra → texto sale. Nada más.
 *
 * Ejecuta:  npm run nivel0
 */
import "../config.js";
import { crearLLM, manejarErrorFatal } from "../bootstrap.js";
import { titulo, azul, amarillo } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  titulo(`NIVEL 0 · Llamada simple · proveedor: ${llm.nombre}`);

  console.log(azul("\n▶ Llamada 1: me presento"));
  const r1 = await llm.chat([{ rol: "user", contenido: "Hola, me llamo Camila. Responde en una sola frase." }]);
  console.log(r1);

  console.log(azul("\n▶ Llamada 2: pregunto mi nombre SIN reenviar el historial"));
  const r2 = await llm.chat([{ rol: "user", contenido: "¿Cómo me llamo?" }]);
  console.log(r2);
  console.log(amarillo("\n👉 El modelo NO recuerda: cada llamada es independiente (sin estado)."));

  console.log(azul("\n▶ Llamada 3: ahora SÍ reenvío el historial completo"));
  const r3 = await llm.chat([
    { rol: "user", contenido: "Hola, me llamo Camila. Responde en una sola frase." },
    { rol: "assistant", contenido: r1 },
    { rol: "user", contenido: "¿Cómo me llamo?" },
  ]);
  console.log(r3);
  console.log(amarillo("\n👉 La 'memoria' es un truco nuestro: reenviar los mensajes anteriores."));

  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
