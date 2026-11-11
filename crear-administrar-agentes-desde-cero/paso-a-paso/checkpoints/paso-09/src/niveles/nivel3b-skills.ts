/**
 * NIVEL 3b — Agente ReAct + SKILLS (herramientas + conocimiento experto bajo demanda).
 *
 * Ejecuta:  npm run skills
 *           npm run skills -- "Haz un reporte del clima en Cali"
 *
 * Observa en la traza:
 *   1) El agente ve solo el CATÁLOGO (nombre + descripción) de cada skill.
 *   2) Decide cargar la skill que aplica  → cargar_skill("reporte-clima")
 *   3) Sigue sus instrucciones y usa las herramientas normales (clima…).
 *
 * Experimento: crea tu propia carpeta skills/<nombre>/SKILL.md y vuelve a ejecutar.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos, todasLasHerramientas } from "../bootstrap.js";
import { ReActAgent } from "../agentes/ReActAgent.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { BibliotecaSkills } from "../skills/biblioteca.js";
import { titulo, verde, azul, gris } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  const skills = new BibliotecaSkills();
  titulo(`NIVEL 3b · ReAct + Skills · LLM: ${llm.nombre}`);

  console.log(gris("Catálogo que ve el agente (solo nombre + descripción):"));
  console.log(gris(skills.catalogo()) + "\n");

  const herramientas = todasLasHerramientas().agregar(skills.comoHerramienta());
  const agente = new ReActAgent({
    llm,
    herramientas,
    nombre: "ReAct+Skills",
    maxPasos: 6,
    escucha: imprimirEvento,
    rol:
      "Eres un asistente del SENA. Dispones de SKILLS: instrucciones expertas que cargas con la herramienta cargar_skill.\n" +
      `CATÁLOGO DE SKILLS:\n${skills.catalogo()}\n` +
      "Si una skill aplica a la tarea, cárgala primero y sigue sus instrucciones al pie de la letra.",
  });

  const pregunta = preguntaDeArgumentos() || "Haz un reporte del clima en Bucaramanga";
  console.log(azul("❓ " + pregunta));
  const r = await agente.ejecutar(pregunta);
  console.log(`${verde("➡️  Respuesta final:")} ${r.respuesta}`);
  console.log(`   pasos usados: ${r.pasos}`);
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
