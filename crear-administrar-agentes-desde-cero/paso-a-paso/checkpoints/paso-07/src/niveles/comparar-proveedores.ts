/**
 * STRATEGY en acción: la MISMA pregunta contra cada proveedor, sin cambiar el agente.
 *
 * Ejecuta:  npm run comparar
 *
 * Solo se prueban los proveedores que tengan clave en .env (más el mock).
 * Luego se demuestra el FALLBACK: el primero está "caído" y el sistema sigue funcionando.
 */
import "../config.js";
import { env } from "../config.js";
import { crearProveedor } from "../llm/factory.js";
import { FallbackProvider } from "../llm/providers/fallback.js";
import { MockProvider } from "../llm/providers/mock.js";
import type { LLMProvider } from "../llm/types.js";
import { titulo, verde, rojo, gris, azul } from "../util/consola.js";

const PREGUNTA = "Explica en una sola frase qué es un agente de IA.";

async function probar(p: LLMProvider) {
  const t0 = Date.now();
  try {
    const r = await p.chat([{ rol: "user", contenido: PREGUNTA }], { maxTokens: 120 });
    console.log(`${verde("✔")} ${p.nombre.padEnd(34)} ${gris(`${Date.now() - t0} ms`)}\n   ${r.trim().replace(/\n+/g, " ").slice(0, 220)}\n`);
  } catch (e) {
    console.log(`${rojo("✘")} ${p.nombre.padEnd(34)} ${rojo((e as Error).message.slice(0, 150))}\n`);
  }
}

async function main() {
  titulo("STRATEGY · misma pregunta, distintos proveedores");
  console.log(azul(`Pregunta: ${PREGUNTA}\n`));

  const estrategias: LLMProvider[] = [];
  for (const [nombre, clave] of [["groq", "GROQ_API_KEY"], ["gemini", "GEMINI_API_KEY"], ["cohere", "COHERE_API_KEY"]] as const) {
    if (env(clave)) estrategias.push(crearProveedor(nombre));
    else console.log(gris(`(omito ${nombre}: no hay ${clave} en .env)`));
  }
  estrategias.push(new MockProvider());
  console.log();

  for (const e of estrategias) await probar(e); // ← mismo código, distinta estrategia

  titulo("FALLBACK · el primero falla y el sistema sigue");
  const real = estrategias.find((e) => e.nombre !== "mock") ?? new MockProvider({ etiqueta: "mock-respaldo" });
  const cadena = new FallbackProvider([new MockProvider({ fallar: true, etiqueta: "proveedor-caido" }), real]);
  await probar(cadena);
  console.log(gris("Bitácora del fallback:\n  " + cadena.bitacora.join("\n  ")));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
