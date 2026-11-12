# Paso 8 · ReAct: pensar → actuar → observar

> **Nivel 3** · ⏱ ~25 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear el agente ReAct: un bucle que usa herramientas las veces que haga falta, con defensas contra fallos.

## ❓ Qué problema resuelve (por qué hacemos esto)

El Nivel 2 se rinde si la tarea necesita varias herramientas. Un agente de verdad repite: piensa qué falta, actúa con una herramienta, observa el resultado y vuelve a pensar, hasta tener la respuesta. Pero un bucle puede salir mal (JSON roto, repetir lo mismo, no terminar nunca), así que el bucle trae defensas.

## 🧠 Conceptos clave

- **ReAct (Reason + Act):** El patrón: Pensar → Actuar → Observar, en bucle, hasta responder.
- **Defensa 1: formato:** Si el JSON es inválido, se le pide al LLM que corrija en vez de abortar.
- **Defensa 2: acciones repetidas:** Una «huella» de cada acción detecta que el agente se quedó dando vueltas.
- **Defensa 3: maxPasos:** Freno de emergencia: ningún agente se ejecuta para siempre ni gasta sin límite.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts
│   │   ├── eventos.ts
│   │   ├── memoria.ts
│   │   ├── protocolo.ts
│   │   ├── ReActAgent.ts   🆕
│   │   └── ToolAgent.ts
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── cohere.ts
│   │   │   ├── fallback.ts
│   │   │   ├── gemini.ts
│   │   │   ├── groq.ts
│   │   │   └── mock.ts
│   │   ├── factory.ts
│   │   ├── medido.ts
│   │   └── types.ts
│   ├── niveles/
│   │   ├── comparar-proveedores.ts
│   │   ├── nivel0-llamada.ts
│   │   ├── nivel1-chatbot.ts
│   │   ├── nivel2-herramientas.ts
│   │   └── nivel3-react.ts   🆕
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

### 1. `src/agentes/ReActAgent.ts` — 🆕 nuevo

**Por qué:** El corazón del curso: el bucle del agente. El LLM es el cerebro que decide; NUESTRO código es el cuerpo que ejecuta, valida y corta.

**Qué mirar:**

- `for (paso = 1; paso <= maxPasos…)`: el bucle, con tope.
- Defensa 1: `try { interpretar }` — si falla, añade un mensaje de corrección y `continue`.
- Defensa 2: `accionesHechas` guarda «accion::entrada»; repetirla devuelve una observación que le dice al LLM que cambie de enfoque.
- Los errores de herramientas vuelven como observación: el agente puede corregirse (ej.: ciudad desconocida).
- Devuelve `ResultadoAgente` con pasos, si se cortó por límite y todos los eventos.

```ts
import type { LLMProvider, Mensaje } from "../llm/types.js";
import type { CajaDeHerramientas } from "../tools/herramienta.js";
import { interpretar, promptProtocolo } from "./protocolo.js";
import type { Escucha, EventoAgente } from "./eventos.js";

export interface ResultadoAgente {
  respuesta: string;
  /** Cuántas vueltas del bucle se usaron. */
  pasos: number;
  /** true si se cortó por llegar al máximo de pasos (no por terminar bien). */
  cortadoPorLimite: boolean;
  eventos: EventoAgente[];
}

export interface OpcionesReAct {
  llm: LLMProvider;
  herramientas: CajaDeHerramientas;
  /** Personalidad y misión del agente (va al system prompt). */
  rol: string;
  nombre?: string;
  /** Freno de emergencia contra bucles infinitos. */
  maxPasos?: number;
  escucha?: Escucha;
}

/**
 * NIVEL 3 — Agente ReAct (Reason + Act).
 *
 *     ┌──────────────────────────────────────────┐
 *     │  1. PENSAR   ¿qué necesito saber/hacer?  │
 *     │  2. ACTUAR   llamar una herramienta      │
 *     │  3. OBSERVAR leer el resultado           │
 *     └───────── repetir hasta tener respuesta ──┘
 *
 * El LLM es el "cerebro" que decide; NUESTRO CÓDIGO es el "cuerpo" que ejecuta.
 */
export class ReActAgent {
  readonly nombre: string;
  private readonly maxPasos: number;

  constructor(private readonly op: OpcionesReAct) {
    this.nombre = op.nombre ?? "ReAct";
    this.maxPasos = op.maxPasos ?? 6;
  }

  async ejecutar(tarea: string, contexto = ""): Promise<ResultadoAgente> {
    const eventos: EventoAgente[] = [];
    const emitir = (paso: number, tipo: EventoAgente["tipo"], texto: string) => {
      const e = { agente: this.nombre, tipo, paso, texto };
      eventos.push(e);
      this.op.escucha?.(e);
    };

    const mensajes: Mensaje[] = [
      { rol: "system", contenido: promptProtocolo(this.op.rol, this.op.herramientas) },
      { rol: "user", contenido: contexto ? `${tarea}\n\n[Contexto de pasos anteriores]\n${contexto}` : tarea },
    ];
    const accionesHechas = new Set<string>();

    for (let paso = 1; paso <= this.maxPasos; paso++) {
      const crudo = await this.op.llm.chat(mensajes, { json: true, temperatura: 0 });

      // --- Defensa 1: el LLM no respondió con el formato esperado ---
      let decision;
      try {
        decision = interpretar(crudo);
      } catch (e) {
        emitir(paso, "error", `Formato inválido (${(e as Error).message}). Se le pide corregir.`);
        mensajes.push(
          { rol: "assistant", contenido: crudo },
          { rol: "user", contenido: 'Error de formato: responde SOLO con un objeto JSON con "accion" o "respuesta_final".' },
        );
        continue;
      }

      emitir(paso, "pensamiento", decision.pensamiento);

      if (decision.tipo === "final") {
        emitir(paso, "final", decision.respuesta);
        return { respuesta: decision.respuesta, pasos: paso, cortadoPorLimite: false, eventos };
      }

      // --- Defensa 2: detectar que el agente repite lo mismo (bucle) ---
      const huella = `${decision.accion}::${decision.entrada}`;
      let observacion: string;
      if (accionesHechas.has(huella)) {
        observacion = "Ya ejecutaste exactamente esa acción. No la repitas: usa lo que ya sabes o cambia de enfoque.";
        emitir(paso, "error", `Acción repetida: ${huella}`);
      } else {
        accionesHechas.add(huella);
        emitir(paso, "accion", `${decision.accion}("${decision.entrada}")`);
        observacion = await this.op.herramientas.ejecutar(decision.accion, decision.entrada);
        emitir(paso, "observacion", observacion);
      }

      mensajes.push({ rol: "assistant", contenido: crudo }, { rol: "user", contenido: `Observación: ${observacion}` });
    }

    // --- Defensa 3: freno de emergencia ---
    const aviso = `No pude terminar en ${this.maxPasos} pasos. Última información: ${mensajes.at(-1)?.contenido ?? ""}`;
    emitir(this.maxPasos, "error", "Límite de pasos alcanzado");
    return { respuesta: aviso, pasos: this.maxPasos, cortadoPorLimite: true, eventos };
  }
}
```

### 2. `src/niveles/nivel3-react.ts` — 🆕 nuevo

**Por qué:** El ejecutable del Nivel 3. Las mismas preguntas que dejaron corto al Nivel 2 ahora se resuelven.

**Qué mirar:**

- Cambia `maxPasos` a 1 y mira el freno de emergencia.
- Quita una herramienta de la caja y mira cómo reacciona.

```ts
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
```

### 3. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run nivel3`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "nivel1": "tsx src/niveles/nivel1-chatbot.ts",
      "nivel2": "tsx src/niveles/nivel2-herramientas.ts",
+     "nivel3": "tsx src/niveles/nivel3-react.ts",
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

### 4. `src/verificar.ts` — ✏️ modificado

**Por qué:** Se agregan las pruebas de este paso (3): «Nivel 3 (ReAct): encadena clima + calculadora»; «Nivel 3 (ReAct): freno de emergencia con maxPasos»; «Nivel 3 (ReAct): un error de herramienta no tumba al agente».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import { MemoriaCompleta, MemoriaVentana } from "./agentes/memoria.js";
  import { ToolAgent } from "./agentes/ToolAgent.js";
+ import { ReActAgent } from "./agentes/ReActAgent.js";
  import type { LLMProvider } from "./llm/types.js";
  
  …
  });
  
+ await prueba("Nivel 3 (ReAct): encadena clima + calculadora", async () => {
+   const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas(), rol: "Asistente." });
+   const r = await agente.ejecutar("¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?");
+   assert.equal(r.cortadoPorLimite, false);
+   assert.equal(r.pasos, 3);
+   assert.match(r.respuesta, /24 °C/);
+   assert.match(r.respuesta, /100/);
+ });
+ 
+ await prueba("Nivel 3 (ReAct): freno de emergencia con maxPasos", async () => {
+   const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas(), rol: "Asistente.", maxPasos: 1 });
+   const r = await agente.ejecutar("¿Qué clima hace en Cali y cuánto es 2 + 2?");
+   assert.equal(r.cortadoPorLimite, true);
+ });
+ 
+ await prueba("Nivel 3 (ReAct): un error de herramienta no tumba al agente", async () => {
+   const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas(), rol: "Asistente." });
+   const r = await agente.ejecutar("¿Qué clima hace en Atlantis?");
+   assert.equal(r.cortadoPorLimite, false);
+   assert.match(r.respuesta, /No tengo datos de "Atlantis"/);
+ });
+ 
  console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
  
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

console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
````

</details>

## ▶️ Ejecutar y comprobar

**1.** Lee la traza en voz alta: pensamiento → acción → observación.

```bash
npm run nivel3
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 3 · Agente ReAct · LLM: mock
════════════════════════════════════════════════════════════

❓ ¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?
  [ReAct · paso 1] 💭 Necesito usar "clima" para avanzar.
  [ReAct · paso 1] 🛠️  clima("Bucaramanga")
  [ReAct · paso 1] 👁️  Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo)
  [ReAct · paso 2] 💭 Necesito usar "calculadora" para avanzar.
  [ReAct · paso 2] 🛠️  calculadora("25 * 4")
  [ReAct · paso 2] 👁️  25 * 4 = 100
  [ReAct · paso 3] 💭 Ya tengo lo necesario para responder.
  [ReAct · paso 3] ✅ Con lo que obtuve: Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo) | 25 * 4 = 100
➡️  Respuesta final: Con lo que obtuve: Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo) | 25 * 4 = 100
   pasos usados: 3

❓ ¿Qué es un token y cuánto es (1000 / 4) + 50?
  [ReAct · paso 1] 💭 Necesito usar "buscar_conocimiento" para avanzar.
  [ReAct · paso 1] 🛠️  buscar_conocimiento("token")
  [ReAct · paso 1] 👁️  Un token es un trozo de texto (≈ 4 caracteres). Los proveedores cobran y limitan el uso por tokens de entrada y salida.
  [ReAct · paso 2] 💭 Necesito usar "calculadora" para avanzar.
  [ReAct · paso 2] 🛠️  calculadora("(1000 / 4) + 50")
  [ReAct · paso 2] 👁️  (1000 / 4) + 50 = 300
  [ReAct · paso 3] 💭 Ya tengo lo necesario para responder.
  [ReAct · paso 3] ✅ Con lo que obtuve: Un token es un trozo de texto (≈ 4 caracteres). Los proveedores cobran y limitan el uso por tokens de entrada y salida. | (1000 / 4) + 50 = 300
➡️  Respuesta final: Con lo que obtuve: Un token es un trozo de texto (≈ 4 caracteres). Los proveedores cobran y limitan el uso por tokens de entrada y salida. | (1000 / 4) + 50 = 300
   pasos usados: 3

📊 6 llamadas · ~2420 tokens in / ~213 out · 1 ms · 0 errores
```

**2.** La herramienta falla y el agente NO se cae: el error vuelve como observación.

```bash
npm run nivel3 -- "¿Qué clima hace en Atlantis?"
```

**Debes ver:**

```
════════════════════════════════════════════════════════════
NIVEL 3 · Agente ReAct · LLM: mock
════════════════════════════════════════════════════════════

❓ "¿Qué clima hace en Atlantis?"
  [ReAct · paso 1] 💭 Necesito usar "clima" para avanzar.
  [ReAct · paso 1] 🛠️  clima("Atlantis")
  [ReAct · paso 1] 👁️  Error al ejecutar "clima": No tengo datos de "Atlantis". Ciudades: bogota, bucaramanga, piedecuesta, medellin, cali, cartagena
  [ReAct · paso 2] 💭 Ya tengo lo necesario para responder.
  [ReAct · paso 2] ✅ Con lo que obtuve: Error al ejecutar "clima": No tengo datos de "Atlantis". Ciudades: bogota, bucaramanga, piedecuesta, medellin, cali, cartagena
➡️  Respuesta final: Con lo que obtuve: Error al ejecutar "clima": No tengo datos de "Atlantis". Ciudades: bogota, bucaramanga, piedecuesta, medellin, cali, cartagena
   pasos usados: 2

📊 2 llamadas · ~762 tokens in / ~81 out · 1 ms · 0 errores
```

**3.** Tres pruebas nuevas: encadenar herramientas, límite de pasos y errores de herramientas.

```bash
npm test
```

**Debes ver:**

````
✅ Calculadora: precedencia, paréntesis y potencias
✅ Calculadora: rechaza código malicioso y divisiones por cero
✅ extraerJson limpia bloques ```json
✅ Strategy: intercambiar proveedor no cambia al agente
✅ Memoria: completa recuerda el nombre, ventana lo olvida
✅ Fallback: salta al siguiente proveedor cuando uno falla
✅ Fallback: error claro si TODOS fallan
✅ LLMMedido: cuenta llamadas y respeta el presupuesto
✅ Factory + Singleton: reutiliza el proveedor configurado
✅ Nivel 2: usa UNA herramienta
✅ Nivel 2: se queda corto con 2 herramientas (límite esperado)
✅ Nivel 3 (ReAct): encadena clima + calculadora
✅ Nivel 3 (ReAct): freno de emergencia con maxPasos
✅ Nivel 3 (ReAct): un error de herramienta no tumba al agente

🎉 14 pruebas pasaron. ¡Entorno listo!
````

## ✅ Checkpoint

«Clima en Bucaramanga y 25 × 4» se resuelve en 3 pasos usando dos herramientas.

Si te quedaste atrás, copia `checkpoints/paso-08/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Qué evita la «huella» de acciones? ¿Qué pasaría sin ella?
- ¿Por qué los errores de una herramienta se devuelven como observación en vez de lanzar una excepción?
- Con un LLM real, ¿qué defensa crees que se activará con más frecuencia?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| El agente repite la misma acción | El modelo no entendió la observación. Mejora la descripción de la herramienta o el texto del error que devuelve. |
| No pude terminar en N pasos | El freno de emergencia actuó: sube maxPasos solo si la tarea realmente lo necesita. |

## ➡️ Siguiente paso

En el paso 9 enseñamos al agente CÓMO hacer tareas con skills (conocimiento en Markdown), no solo QUÉ puede hacer.

---
[← Paso 7](07-protocolo-json-toolagent.md) · [Paso 9 →](09-nivel3b-skills.md)
