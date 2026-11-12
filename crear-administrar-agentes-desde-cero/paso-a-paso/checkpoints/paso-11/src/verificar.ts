/**
 * Autotest SIN internet ni claves (usa el MockProvider).
 * Ejecuta:  npm test
 * Si todo sale ✅, tu entorno y tu código base están listos para la clase.
 */
import assert from "node:assert/strict";
import { evaluar } from "./tools/calculadora.js";
import { extraerJson } from "./util/json.js";
import { MockProvider } from "./llm/providers/mock.js";
import { FallbackProvider } from "./llm/providers/fallback.js";
import { LLMMedido } from "./llm/medido.js";
import { CajaDeHerramientas } from "./tools/herramienta.js";
import { calculadora } from "./tools/calculadora.js";
import { buscarConocimiento, clima, hora } from "./tools/basicas.js";
import { ChatAgent } from "./agentes/ChatAgent.js";
import { MemoriaCompleta, MemoriaVentana } from "./agentes/memoria.js";
import { ToolAgent } from "./agentes/ToolAgent.js";
import { ReActAgent } from "./agentes/ReActAgent.js";
import { PlanificadorAgent } from "./agentes/PlanificadorAgent.js";
import { Orquestador } from "./agentes/Orquestador.js";
import { BibliotecaSkills, parsearSkill } from "./skills/biblioteca.js";
import type { LLMProvider } from "./llm/types.js";

let ok = 0;
async function prueba(nombre: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    ok++;
    console.log(`✅ ${nombre}`);
  } catch (e) {
    console.error(`❌ ${nombre}\n   ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

const todas = () => new CajaDeHerramientas([calculadora, hora, clima, buscarConocimiento]);

await prueba("Calculadora: precedencia, paréntesis y potencias", () => {
  assert.equal(evaluar("2 + 3 * 4"), 14);
  assert.equal(evaluar("(12 + 8) * 3"), 60);
  assert.equal(evaluar("2 ^ 3 ^ 2"), 512);
  assert.equal(evaluar("-5 + 10 / 4"), -2.5);
});

await prueba("Calculadora: rechaza código malicioso y divisiones por cero", () => {
  assert.throws(() => evaluar("process.exit()"));
  assert.throws(() => evaluar("1/0"));
});

await prueba("extraerJson limpia bloques ```json", () => {
  assert.deepEqual(extraerJson('Claro:\n```json\n{"a": 1}\n```'), { a: 1 });
});

await prueba("Strategy: intercambiar proveedor no cambia al agente", async () => {
  const a: LLMProvider = new MockProvider({ etiqueta: "A" });
  const b: LLMProvider = new MockProvider({ etiqueta: "B" });
  for (const llm of [a, b]) {
    const bot = new ChatAgent(llm, "Eres un tutor.");
    assert.ok((await bot.responder("hola")).length > 0);
  }
});

await prueba("Memoria: completa recuerda el nombre, ventana lo olvida", async () => {
  const llm = new MockProvider();
  const completa = new ChatAgent(llm, "Tutor", new MemoriaCompleta());
  const ventana = new ChatAgent(llm, "Tutor", new MemoriaVentana(2));
  for (const bot of [completa, ventana]) {
    await bot.responder("Me llamo Camila");
    await bot.responder("hablemos de otra cosa");
    await bot.responder("y de otra más");
  }
  assert.match(await completa.responder("¿Cómo me llamo?"), /Camila/);
  assert.match(await ventana.responder("¿Cómo me llamo?"), /No lo sé/);
});

await prueba("Fallback: salta al siguiente proveedor cuando uno falla", async () => {
  const f = new FallbackProvider([new MockProvider({ fallar: true, etiqueta: "caido" }), new MockProvider({ etiqueta: "sano" })]);
  assert.ok((await f.chat([{ rol: "user", contenido: "hola" }])).length > 0);
  assert.match(f.bitacora.join("|"), /❌ caido.*\|✅ sano/);
});

await prueba("Fallback: error claro si TODOS fallan", async () => {
  const f = new FallbackProvider([new MockProvider({ fallar: true }), new MockProvider({ fallar: true })]);
  await assert.rejects(() => f.chat([{ rol: "user", contenido: "hola" }]), /Todos los proveedores fallaron/);
});

await prueba("LLMMedido: cuenta llamadas y respeta el presupuesto", async () => {
  const m = new LLMMedido(new MockProvider(), 2);
  await m.chat([{ rol: "user", contenido: "uno" }]);
  await m.chat([{ rol: "user", contenido: "dos" }]);
  await assert.rejects(() => m.chat([{ rol: "user", contenido: "tres" }]), /Presupuesto agotado/);
  assert.equal(m.llamadas, 2);
});

await prueba("Factory + Singleton: reutiliza el proveedor configurado", async () => {
  const { crearProveedor } = await import("./llm/factory.js");
  assert.strictEqual(crearProveedor("mock"), crearProveedor("MOCK"));
});

await prueba("Nivel 2: usa UNA herramienta", async () => {
  const r = await new ToolAgent(new MockProvider(), todas()).ejecutar("¿Cuánto es (12 + 8) * 3?");
  assert.match(r, /60/);
});

await prueba("Nivel 2: se queda corto con 2 herramientas (límite esperado)", async () => {
  const r = await new ToolAgent(new MockProvider(), todas()).ejecutar("¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?");
  assert.match(r, /Nivel 2 solo usa una herramienta/);
});

await prueba("Nivel 3 (ReAct): encadena clima + calculadora", async () => {
  const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas(), rol: "Asistente." });
  const r = await agente.ejecutar("¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?");
  assert.equal(r.cortadoPorLimite, false);
  assert.equal(r.pasos, 3);
  assert.match(r.respuesta, /24 °C/);
  assert.match(r.respuesta, /100/);
});

await prueba("Nivel 3 (ReAct): freno de emergencia con maxPasos", async () => {
  const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas(), rol: "Asistente.", maxPasos: 1 });
  const r = await agente.ejecutar("¿Qué clima hace en Cali y cuánto es 2 + 2?");
  assert.equal(r.cortadoPorLimite, true);
});

await prueba("Nivel 3 (ReAct): un error de herramienta no tumba al agente", async () => {
  const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas(), rol: "Asistente." });
  const r = await agente.ejecutar("¿Qué clima hace en Atlantis?");
  assert.equal(r.cortadoPorLimite, false);
  assert.match(r.respuesta, /No tengo datos de "Atlantis"/);
});

await prueba("Nivel 4 (Planificador): crea plan, ejecuta pasos y sintetiza", async () => {
  const llm = new MockProvider();
  const ejecutor = new ReActAgent({ llm, herramientas: todas(), rol: "Ejecutor." });
  const r = await new PlanificadorAgent(llm, ejecutor).ejecutar("Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * 7");
  assert.equal(r.plan.length, 3);
  assert.match(r.respuesta, /126/);
  assert.match(r.respuesta, /25 °C/);
});

await prueba("Nivel 5 (Orquestador): delega a especialistas y lleva estadísticas", async () => {
  const llm = new MockProvider();
  const investigador = new ReActAgent({ llm, nombre: "Investigador", rol: "Investigador.", herramientas: new CajaDeHerramientas([buscarConocimiento, clima, hora]) });
  const matematico = new ReActAgent({ llm, nombre: "Matematico", rol: "Matemático.", herramientas: new CajaDeHerramientas([calculadora]) });
  const jefe = new Orquestador(llm, [
    { nombre: "investigador", descripcion: "conocimiento y clima", agente: investigador },
    { nombre: "matematico", descripcion: "cálculos", agente: matematico },
  ]);
  const r = await jefe.ejecutar("¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?");
  assert.equal(r.delegaciones.length, 3);
  assert.equal(r.delegaciones.filter((d) => d.agente === "matematico").length, 1);
  assert.match(r.respuesta, /= 12/);
  assert.equal(jefe.estadisticas.get("matematico")!.exitos, 1);
  assert.equal(jefe.estadisticas.get("investigador")!.exitos, 2);
});

await prueba("Skills: el catálogo solo trae nombre y descripción (divulgación progresiva)", () => {
  const b = new BibliotecaSkills();
  assert.ok(b.nombres().includes("reporte-clima") && b.nombres().includes("resumen-ejecutivo"));
  assert.match(b.catalogo(), /reporte-clima: Cómo presentar/);
  assert.doesNotMatch(b.catalogo(), /paraguas/); // el contenido completo NO está en el catálogo…
  assert.match(b.cargar("reporte-clima"), /paraguas/); // …se obtiene al cargarla
});

await prueba("Skills: parsearSkill exige 'description' y cargar() da error útil", () => {
  assert.throws(() => parsearSkill("---\nname: x\n---\ncuerpo", "x"), /description/);
  assert.throws(() => parsearSkill("sin encabezado", "x"), /encabezado/);
  assert.throws(() => new BibliotecaSkills().cargar("no-existe"), /Skills válidas: .*reporte-clima/);
});

await prueba("Agente + skill: carga la skill, luego usa la herramienta y responde", async () => {
  const b = new BibliotecaSkills();
  const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas().agregar(b.comoHerramienta()), rol: `Asistente.\n${b.catalogo()}` });
  const r = await agente.ejecutar("Haz un reporte del clima en Bucaramanga");
  assert.equal(r.cortadoPorLimite, false);
  assert.equal(r.pasos, 3); // cargar_skill → clima → respuesta
  assert.match(r.respuesta, /Siguiendo la skill "reporte-clima"/);
  assert.match(r.respuesta, /24 °C/);
});

console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
