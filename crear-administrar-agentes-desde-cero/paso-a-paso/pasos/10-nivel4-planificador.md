# Paso 10 · Plan-and-Execute: planificar antes de actuar

> **Nivel 4** · ⏱ ~20 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear un agente que primero hace un plan visible, luego ejecuta cada paso con un agente ReAct y al final sintetiza la respuesta.

## ❓ Qué problema resuelve (por qué hacemos esto)

En tareas largas, un agente ReAct puro puede «perderse». Si primero escribe un PLAN, tienes un mapa que se puede mostrar, aprobar y depurar paso a paso. Además cada paso se resuelve por separado, con el contexto de los anteriores.

## 🧠 Conceptos clave

- **Plan-and-Execute:** Tres fases: planificar (LLM → lista de pasos), ejecutar (un ReAct por paso) y sintetizar (unir resultados).
- **Contexto acumulado:** Cada paso recibe los resultados de los anteriores.
- **Plan aprobable:** En un producto real podrías pedirle al usuario que apruebe el plan antes de ejecutar.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── skills/
│   ├── reporte-clima/
│   │   └── SKILL.md
│   └── resumen-ejecutivo/
│       └── SKILL.md
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts
│   │   ├── eventos.ts
│   │   ├── memoria.ts
│   │   ├── PlanificadorAgent.ts   🆕
│   │   ├── protocolo.ts
│   │   ├── ReActAgent.ts
│   │   └── ToolAgent.ts
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── cohere.ts
│   │   │   ├── fallback.ts
│   │   │   ├── gemini.ts
│   │   │   ├── groq.ts
│   │   │   └── mock.ts   ✏️
│   │   ├── factory.ts
│   │   ├── medido.ts
│   │   └── types.ts
│   ├── niveles/
│   │   ├── comparar-proveedores.ts
│   │   ├── nivel0-llamada.ts
│   │   ├── nivel1-chatbot.ts
│   │   ├── nivel2-herramientas.ts
│   │   ├── nivel3-react.ts
│   │   ├── nivel3b-skills.ts
│   │   └── nivel4-planificador.ts   🆕
│   ├── skills/
│   │   └── biblioteca.ts
│   ├── tools/
│   │   ├── basicas.ts
│   │   ├── calculadora.ts
│   │   └── herramienta.ts
│   ├── util/
│   │   ├── consola.ts
│   │   ├── http.ts
│   │   └── json.ts
│   ├── bootstrap.ts
│   ├── config.ts
│   └── verificar.ts   ✏️
├── .env.example
├── .gitignore
├── package.json   ✏️
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/agentes/PlanificadorAgent.ts` — 🆕 nuevo

**Por qué:** Orquesta las tres fases. También contiene `sintetizar()`, que reutilizaremos en el Nivel 5.

**Qué mirar:**

- `planear()` le pide al LLM un JSON con la lista de pasos y la limita a `maxPasosPlan`.
- Reutiliza al `ReActAgent` como «ejecutor»: componer agentes pequeños en lugar de uno gigante.
- `sintetizar()` obliga al LLM a usar SOLO los resultados entregados: reduce alucinaciones.

```ts
import type { LLMProvider } from "../llm/types.js";
import { extraerJson } from "../util/json.js";
import type { Escucha } from "./eventos.js";
import type { ReActAgent } from "./ReActAgent.js";

export interface ResultadoPlan {
  plan: string[];
  resultados: { paso: string; respuesta: string }[];
  respuesta: string;
}

/** Une los resultados parciales en una respuesta final (usado por Nivel 4 y Nivel 5). */
export async function sintetizar(
  llm: LLMProvider,
  tarea: string,
  resultados: { paso: string; respuesta: string }[],
): Promise<string> {
  const datos = resultados.map((r, i) => `${i + 1}. ${r.paso} → ${r.respuesta}`).join("\n");
  return llm.chat([
    {
      rol: "system",
      contenido:
        "Eres un SINTETIZADOR. Con los resultados parciales, redacta una respuesta final clara y breve en español. " +
        "Usa SOLO los datos entregados; no inventes nada.",
    },
    { rol: "user", contenido: `Tarea original: ${tarea}\n\nResultados:\n${datos}` },
  ]);
}

/**
 * NIVEL 4 — Plan-and-Execute (planificar y luego ejecutar).
 *
 *   1) PLANIFICAR : un LLM divide la tarea en pasos.
 *   2) EJECUTAR   : un agente ReAct resuelve cada paso (con el contexto de los anteriores).
 *   3) SINTETIZAR : otro LLM une todo en una respuesta final.
 *
 * Ventaja sobre ReAct puro: en tareas largas el agente no se "pierde", porque
 * tiene un mapa (el plan) y puedes mostrarlo / aprobarlo antes de ejecutar.
 */
export class PlanificadorAgent {
  constructor(
    private readonly llm: LLMProvider,
    private readonly ejecutor: ReActAgent,
    private readonly escucha: Escucha = () => {},
    private readonly maxPasosPlan = 6,
  ) {}

  async planear(tarea: string): Promise<string[]> {
    const crudo = await this.llm.chat(
      [
        {
          rol: "system",
          contenido:
            "Eres un PLANIFICADOR. Divide la tarea del usuario en pasos cortos, concretos y en orden. " +
            `Máximo ${this.maxPasosPlan} pasos. Responde SOLO con JSON: {"pensamiento": "...", "pasos": ["paso 1", "paso 2"]}`,
        },
        { rol: "user", contenido: tarea },
      ],
      { json: true, temperatura: 0 },
    );
    const pasos = extraerJson<{ pasos?: unknown }>(crudo).pasos;
    if (!Array.isArray(pasos) || !pasos.length) throw new Error("El planificador no devolvió pasos");
    return pasos.map(String).slice(0, this.maxPasosPlan);
  }

  async ejecutar(tarea: string): Promise<ResultadoPlan> {
    const plan = await this.planear(tarea);
    this.escucha({ agente: "Planificador", tipo: "plan", paso: 0, texto: plan.map((p, i) => `${i + 1}) ${p}`).join("  ") });

    const resultados: ResultadoPlan["resultados"] = [];
    for (const [i, paso] of plan.entries()) {
      this.escucha({ agente: "Planificador", tipo: "delegacion", paso: i + 1, texto: `Ejecutando: ${paso}` });
      const contexto = resultados.map((r) => `- ${r.paso}: ${r.respuesta}`).join("\n");
      const r = await this.ejecutor.ejecutar(paso, contexto);
      resultados.push({ paso, respuesta: r.respuesta });
    }

    const respuesta = await sintetizar(this.llm, tarea, resultados);
    this.escucha({ agente: "Planificador", tipo: "final", paso: plan.length + 1, texto: respuesta });
    return { plan, resultados, respuesta };
  }
}
```

### 2. `src/niveles/nivel4-planificador.ts` — 🆕 nuevo

**Por qué:** El ejecutable del Nivel 4. Imprime el plan antes de ejecutarlo.

**Qué mirar:**

- Fíjate cómo se imprime el plan (📋) ANTES de la primera acción.
- Usa un presupuesto de llamadas mayor porque hay más pasos.

```ts
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
```

### 3. `src/llm/providers/mock.ts` — ✏️ modificado

**Por qué:** El mock aprende a actuar como «planificador»: divide la tarea en pasos.

**Qué mirar:**

- Divide por «y», comas y punto y coma: suficiente para la demo.

**Qué cambió respecto al paso anterior:**

```diff
  …
      const resto = mensajes.filter((m) => m.rol !== "system");
  
+     if (system.includes("planificador")) return this.planificar(resto);
      if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
      if (system.includes('"accion"')) return this.reaccionar(resto, system);
  …
      return hallazgos.sort((a, b) => a.pos - b.pos);
    }
+ 
+   // ---------- Nivel 4: planificador ----------
+   private planificar(msgs: Mensaje[]): string {
+     const tarea = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
+     const pasos = tarea
+       .split(/\s+y\s+|,\s*|;\s*|\s+luego\s+|\s+despu[eé]s\s+/i)
+       .map((p) => p.replace(/^[¿¡\s]+|[?!.\s]+$/g, ""))
+       .filter((p) => p.length > 3);
+     return JSON.stringify({ pensamiento: "Divido la tarea en pasos pequeños.", pasos: pasos.length ? pasos : [tarea] });
+   }
  }
  
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```ts
import { ErrorLLM, type LLMProvider, type Mensaje } from "../types.js";
import { dormir } from "../../util/http.js";

interface OpcionesMock {
  /** Simula una caída del proveedor (para practicar el fallback). */
  fallar?: boolean;
  /** Latencia artificial en milisegundos. */
  latenciaMs?: number;
  /** Nombre visible (útil cuando creas varios mocks). */
  etiqueta?: string;
}

/**
 * Estrategia #4 — Mock: un "LLM falso" que funciona SIN internet y SIN claves.
 * No es inteligente: usa reglas simples y reconoce el protocolo de nuestros agentes.
 * Sirve para: practicar sin gastar cuota, hacer pruebas y entender el flujo.
 */
export class MockProvider implements LLMProvider {
  readonly nombre: string;
  constructor(private readonly op: OpcionesMock = {}) {
    this.nombre = op.etiqueta ?? "mock";
  }

  async chat(mensajes: Mensaje[]): Promise<string> {
    if (this.op.fallar) throw new ErrorLLM(this.nombre, "Fallo simulado (503 servicio no disponible)", 503);
    if (this.op.latenciaMs) await dormir(this.op.latenciaMs);

    const system = mensajes.filter((m) => m.rol === "system").map((m) => m.contenido).join(" ").toLowerCase();
    const resto = mensajes.filter((m) => m.rol !== "system");

    if (system.includes("planificador")) return this.planificar(resto);
    if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
    if (system.includes('"accion"')) return this.reaccionar(resto, system);
    return this.conversar(resto);
  }

  // ---------- Conversación normal (niveles 0 y 1) ----------
  private conversar(msgs: Mensaje[]): string {
    const ultimo = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
    if (/c[oó]mo me llamo|cu[aá]l es mi nombre/i.test(ultimo)) {
      const dicho = msgs
        .map((m) => /(?:me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+)/i.exec(m.contenido)?.[1])
        .filter(Boolean)
        .at(-1);
      return dicho
        ? `Te llamas ${dicho}. ¡Lo recuerdo porque está en el historial que me enviaron!`
        : "No lo sé: no está en el historial que recibí.";
    }
    if (/\bhola\b|buenas/i.test(ultimo)) return "¡Hola! Soy un LLM simulado (mock). Cambia LLM_PROVIDER en .env para hablar con uno real.";
    return `(mock) Recibí ${msgs.length} mensaje(s). Tu último mensaje fue: "${ultimo.slice(0, 80)}"`;
  }

  // ---------- Protocolo de herramientas (niveles 2, 3 y especialistas) ----------
  private reaccionar(msgs: Mensaje[], system: string): string {
    // Solo la tarea: ignoramos el bloque de contexto de pasos anteriores.
    const pregunta = (msgs.find((m) => m.rol === "user")?.contenido ?? "").split("\n\n[Contexto")[0] ?? "";
    const observaciones = msgs
      .filter((m) => m.rol === "user" && m.contenido.startsWith("Observación:"))
      .map((m) => m.contenido.replace("Observación:", "").trim());

    // Solo considera las herramientas que el agente realmente tiene disponibles.
    const pendientes = this.herramientasNecesarias(pregunta).filter((h) => system.includes(`- ${h.nombre}:`));
    const siguiente = pendientes[observaciones.length];

    if (siguiente) {
      return JSON.stringify({
        pensamiento: `Necesito usar "${siguiente.nombre}" para avanzar.`,
        accion: siguiente.nombre,
        entrada: siguiente.entrada,
      });
    }
    // Las observaciones que son instrucciones de una skill no son "datos": se usan como guía.
    const PREFIJO_SKILL = "Instrucciones de la skill";
    const skill = /^Instrucciones de la skill "([^"]+)"/.exec(observaciones.find((o) => o.startsWith(PREFIJO_SKILL)) ?? "")?.[1];
    const datos = observaciones.filter((o) => !o.startsWith(PREFIJO_SKILL));
    const respuesta = observaciones.length
      ? `${skill ? `Siguiendo la skill "${skill}": ` : "Con lo que obtuve: "}${datos.join(" | ")}`
      : `No necesito herramientas para esto. (mock) Pregunta: ${pregunta.slice(0, 80)}`;
    return JSON.stringify({ pensamiento: "Ya tengo lo necesario para responder.", respuesta_final: respuesta });
  }

  private herramientasNecesarias(texto: string) {
    const hallazgos: { pos: number; nombre: string; entrada: string }[] = [];
    const clima = /clima|temperatura|llueve/i.exec(texto);
    if (clima) {
      hallazgos.push({ pos: clima.index, nombre: "clima", entrada: /\ben ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/.exec(texto)?.[1] ?? "Bogotá" });
    }
    // Expresión matemática: números, operadores y paréntesis (debe contener al menos un operador).
    const mat = [...texto.matchAll(/\(*\d[\d\s+\-*/^%().]*[\d)]/g)].find((m) => /[+\-*/^%]/.test(m[0]));
    if (mat) hallazgos.push({ pos: mat.index ?? 0, nombre: "calculadora", entrada: mat[0].trim() });
    // Si piden un "reporte/informe", el mock carga la skill adecuada ANTES de actuar.
    const rep = /\b(reporte|informe)\b/i.exec(texto);
    if (rep) {
      hallazgos.push({ pos: rep.index, nombre: "cargar_skill", entrada: /clima|temperatura/i.test(texto) ? "reporte-clima" : "resumen-ejecutivo" });
    }
    const hora = /\bhora\b/i.exec(texto);
    if (hora) hallazgos.push({ pos: hora.index, nombre: "hora", entrada: "" });
    const def = /qu[eé] (?:es|son) (?:un |una |el |la |los |las )?(.+?)(?:\s+y\s|[?.,;]|$)/i.exec(texto);
    if (def) hallazgos.push({ pos: def.index, nombre: "buscar_conocimiento", entrada: def[1]!.trim() });
    return hallazgos.sort((a, b) => a.pos - b.pos);
  }

  // ---------- Nivel 4: planificador ----------
  private planificar(msgs: Mensaje[]): string {
    const tarea = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
    const pasos = tarea
      .split(/\s+y\s+|,\s*|;\s*|\s+luego\s+|\s+despu[eé]s\s+/i)
      .map((p) => p.replace(/^[¿¡\s]+|[?!.\s]+$/g, ""))
      .filter((p) => p.length > 3);
    return JSON.stringify({ pensamiento: "Divido la tarea en pasos pequeños.", pasos: pasos.length ? pasos : [tarea] });
  }
}
```

</details>

### 4. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run nivel4`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "nivel3": "tsx src/niveles/nivel3-react.ts",
      "skills": "tsx src/niveles/nivel3b-skills.ts",
+     "nivel4": "tsx src/niveles/nivel4-planificador.ts",
      "comparar": "tsx src/niveles/comparar-proveedores.ts",
      "test": "tsx src/verificar.ts"
  …
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```json
{
  "name": "agentes-desde-cero",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Clase: crear y administrar agentes de IA desde cero con TypeScript, Node y patrón Strategy",
  "engines": { "node": ">=20.12" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "nivel0": "tsx src/niveles/nivel0-llamada.ts",
    "nivel1": "tsx src/niveles/nivel1-chatbot.ts",
    "nivel2": "tsx src/niveles/nivel2-herramientas.ts",
    "nivel3": "tsx src/niveles/nivel3-react.ts",
    "skills": "tsx src/niveles/nivel3b-skills.ts",
    "nivel4": "tsx src/niveles/nivel4-planificador.ts",
    "comparar": "tsx src/niveles/comparar-proveedores.ts",
    "test": "tsx src/verificar.ts"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

</details>

### 5. `src/verificar.ts` — ✏️ modificado

**Por qué:** Se agregan las pruebas de este paso (1): «Nivel 4 (Planificador): crea plan, ejecuta pasos y sintetiza».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import { ToolAgent } from "./agentes/ToolAgent.js";
  import { ReActAgent } from "./agentes/ReActAgent.js";
+ import { PlanificadorAgent } from "./agentes/PlanificadorAgent.js";
  import { BibliotecaSkills, parsearSkill } from "./skills/biblioteca.js";
  import type { LLMProvider } from "./llm/types.js";
  …
  });
  
+ await prueba("Nivel 4 (Planificador): crea plan, ejecuta pasos y sintetiza", async () => {
+   const llm = new MockProvider();
+   const ejecutor = new ReActAgent({ llm, herramientas: todas(), rol: "Ejecutor." });
+   const r = await new PlanificadorAgent(llm, ejecutor).ejecutar("Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * 7");
+   assert.equal(r.plan.length, 3);
+   assert.match(r.respuesta, /126/);
+   assert.match(r.respuesta, /25 °C/);
+ });
+ 
  await prueba("Skills: el catálogo solo trae nombre y descripción (divulgación progresiva)", () => {
    const b = new BibliotecaSkills();
  …
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

````ts
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
````

</details>

## ▶️ Ejecutar y comprobar

**1.** Observa el plan y luego cada paso ejecutado por el agente ejecutor.

```bash
npm run nivel4
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 4 · Planificador · LLM: mock
════════════════════════════════════════════════════════════

🎯 Tarea: Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * 7

  [Planificador · paso 0] 📋 1) Dime qué es un agente  2) el clima en Piedecuesta  3) cuánto es 18 * 7
  [Planificador · paso 1] 📨 Ejecutando: Dime qué es un agente
  [Ejecutor · paso 1] 💭 Necesito usar "buscar_conocimiento" para avanzar.
  [Ejecutor · paso 1] 🛠️  buscar_conocimiento("agente")
  [Ejecutor · paso 1] 👁️  Un agente es un programa que usa un LLM para decidir qué acciones tomar (herramientas) en un bucle hasta cumplir un objetivo.
  [Ejecutor · paso 2] 💭 Ya tengo lo necesario para responder.
  [Ejecutor · paso 2] ✅ Con lo que obtuve: Un agente es un programa que usa un LLM para decidir qué acciones tomar (herramientas) en un bucle hasta cumplir un objetivo.
  [Planificador · paso 2] 📨 Ejecutando: el clima en Piedecuesta
  [Ejecutor · paso 1] 💭 Necesito usar "clima" para avanzar.
  [Ejecutor · paso 1] 🛠️  clima("Piedecuesta")
  [Ejecutor · paso 1] 👁️  Clima en Piedecuesta: 25 °C, soleado (datos de ejemplo)
  [Ejecutor · paso 2] 💭 Ya tengo lo necesario para responder.
  [Ejecutor · paso 2] ✅ Con lo que obtuve: Clima en Piedecuesta: 25 °C, soleado (datos de ejemplo)
  [Planificador · paso 3] 📨 Ejecutando: cuánto es 18 * 7
  [Ejecutor · paso 1] 💭 Necesito usar "calculadora" para avanzar.
  [Ejecutor · paso 1] 🛠️  calculadora("18 * 7")
  [Ejecutor · paso 1] 👁️  18 * 7 = 126
  [Ejecutor · paso 2] 💭 Ya tengo lo necesario para responder.
  [Ejecutor · paso 2] ✅ Con lo que obtuve: 18 * 7 = 126
  [Planificador · paso 4] ✅ (mock) Recibí 1 mensaje(s). Tu último mensaje fue: "Tarea original: Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * "

➡️  Respuesta final:
(mock) Recibí 1 mensaje(s). Tu último mensaje fue: "Tarea original: Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * "

📊 8 llamadas · ~2667 tokens in / ~267 out · 2 ms · 0 errores
```

## ✅ Checkpoint

Se imprime un plan de 3 pasos y cada uno se ejecuta con su propia traza.

Si te quedaste atrás, copia `checkpoints/paso-10/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Cuándo preferirías Plan-and-Execute sobre ReAct puro? ¿Y al revés?
- ¿Qué pasa si el plan es malo? ¿Cómo lo detectarías antes de ejecutarlo?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| El planificador no devolvió pasos | El modelo no respondió el JSON esperado. Con modelos reales baja la temperatura y revisa el prompt. |

## ➡️ Siguiente paso

En el paso 11 repartimos el trabajo entre agentes especialistas y los administramos.

---
[← Paso 9](09-nivel3b-skills.md) · [Paso 11 →](11-nivel5-multiagente.md)
