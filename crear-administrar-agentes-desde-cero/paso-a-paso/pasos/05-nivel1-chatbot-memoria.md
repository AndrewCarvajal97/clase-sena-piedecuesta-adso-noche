# Paso 5 · Chatbot con rol y memoria

> **Nivel 1** · ⏱ ~20 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear un chatbot con personalidad (system prompt) y elegir cómo recuerda: completa, ventana o resumen.

## ❓ Qué problema resuelve (por qué hacemos esto)

Una conversación real necesita contexto: el modelo no recuerda nada, así que debes reenviarle el historial. Pero reenviar todo cuesta cada vez más y se acerca al límite de tokens; reenviar poco hace que olvide. Decidir cuánto recordar es una decisión INTERCAMBIABLE: otra vez Strategy.

## 🧠 Conceptos clave

- **System prompt:** Instrucciones permanentes: rol, reglas y formato. Se envía en cada llamada.
- **Memoria como Strategy:** Completa (todo), Ventana (últimos N) y Resumen (lo viejo se comprime con el propio LLM).
- **Equilibrio costo ↔ olvido:** Más memoria = más tokens y más costo. Menos memoria = el bot «olvida».

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts   🆕
│   │   └── memoria.ts   🆕
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
│   │   └── nivel1-chatbot.ts   🆕
│   ├── util/
│   │   ├── consola.ts   ✏️
│   │   └── http.ts
│   ├── bootstrap.ts
│   ├── config.ts
│   └── verificar.ts   ✏️
├── .env.example
├── .gitignore
├── package.json   ✏️
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/agentes/memoria.ts` — 🆕 nuevo

**Por qué:** Define la interfaz EstrategiaMemoria y tres implementaciones. Es el segundo patrón Strategy del proyecto.

**Qué mirar:**

- `MemoriaCompleta` guarda todo: simple, pero crece sin límite.
- `MemoriaVentana(n)` descarta lo antiguo: costo constante pero olvida (¡se verá en la demo!).
- `MemoriaResumen` usa el propio LLM para resumir lo viejo: equilibrio, a cambio de una llamada extra.

```ts
import type { LLMProvider, Mensaje } from "../llm/types.js";

/**
 * SEGUNDO PATRÓN STRATEGY de la clase: la MEMORIA.
 * Un LLM no recuerda nada entre llamadas: tú le reenvías el historial.
 * ¿Cuánto historial reenviar? Esa decisión es intercambiable → Strategy.
 */
export interface EstrategiaMemoria {
  readonly nombre: string;
  agregar(m: Mensaje): Promise<void> | void;
  /** Mensajes que se enviarán al LLM (sin el system prompt). */
  obtener(): Mensaje[];
  limpiar(): void;
}

/** Guarda TODO. Simple, pero crece sin límite (más tokens = más caro y más lento). */
export class MemoriaCompleta implements EstrategiaMemoria {
  readonly nombre = "completa";
  protected historial: Mensaje[] = [];
  agregar(m: Mensaje) { this.historial.push(m); }
  obtener() { return [...this.historial]; }
  limpiar() { this.historial = []; }
}

/** Solo recuerda los últimos N mensajes (ventana deslizante). Barata, pero olvida lo antiguo. */
export class MemoriaVentana implements EstrategiaMemoria {
  readonly nombre: string;
  private historial: Mensaje[] = [];
  constructor(private readonly maxMensajes = 6) {
    this.nombre = `ventana(${maxMensajes})`;
  }
  agregar(m: Mensaje) {
    this.historial.push(m);
    if (this.historial.length > this.maxMensajes) this.historial = this.historial.slice(-this.maxMensajes);
  }
  obtener() { return [...this.historial]; }
  limpiar() { this.historial = []; }
}

/** Cuando el historial se alarga, le pide al propio LLM que lo resuma. Equilibrio calidad/costo. */
export class MemoriaResumen implements EstrategiaMemoria {
  readonly nombre = "resumen";
  private resumen = "";
  private reciente: Mensaje[] = [];

  constructor(private readonly llm: LLMProvider, private readonly mantener = 4) {}

  async agregar(m: Mensaje) {
    this.reciente.push(m);
    if (this.reciente.length > this.mantener * 2) {
      const viejos = this.reciente.splice(0, this.reciente.length - this.mantener);
      const texto = viejos.map((x) => `${x.rol}: ${x.contenido}`).join("\n");
      this.resumen = await this.llm.chat([
        { rol: "system", contenido: "Eres un resumidor. Resume la conversación conservando nombres, datos y decisiones. Máximo 80 palabras." },
        { rol: "user", contenido: `Resumen previo: ${this.resumen || "(ninguno)"}\n\nNueva conversación:\n${texto}` },
      ]);
    }
  }

  obtener(): Mensaje[] {
    const base: Mensaje[] = this.resumen
      ? [{ rol: "user", contenido: `[Resumen de la conversación anterior]: ${this.resumen}` }, { rol: "assistant", contenido: "Entendido, tengo ese contexto." }]
      : [];
    return [...base, ...this.reciente];
  }
  limpiar() { this.resumen = ""; this.reciente = []; }
}
```

### 2. `src/agentes/ChatAgent.ts` — 🆕 nuevo

**Por qué:** Nuestro primer agente: junta un LLM, un system prompt y una memoria. Todavía no decide acciones, pero ya tiene personalidad y contexto.

**Qué mirar:**

- Recibe un `LLMProvider` y una `EstrategiaMemoria`: dos Strategy combinadas.
- En cada turno: guarda lo que dijo el usuario → envía system + memoria → guarda la respuesta.
- `mensajesEnMemoria` deja ver cómo crece (o no) el contexto.

```ts
import type { LLMProvider } from "../llm/types.js";
import { MemoriaCompleta, type EstrategiaMemoria } from "./memoria.js";

/**
 * NIVEL 1 — Chatbot con rol y memoria.
 * Todavía NO es un agente (no decide acciones), pero ya tiene:
 *   • un system prompt (personalidad / reglas)
 *   • memoria (historial reenviado en cada turno)
 */
export class ChatAgent {
  constructor(
    private readonly llm: LLMProvider,
    private readonly systemPrompt: string,
    private readonly memoria: EstrategiaMemoria = new MemoriaCompleta(),
  ) {}

  async responder(texto: string): Promise<string> {
    await this.memoria.agregar({ rol: "user", contenido: texto });

    const respuesta = await this.llm.chat([
      { rol: "system", contenido: this.systemPrompt },
      ...this.memoria.obtener(),
    ]);

    await this.memoria.agregar({ rol: "assistant", contenido: respuesta });
    return respuesta;
  }

  /** ¿Cuántos mensajes se están reenviando? Útil para ver cómo crece el costo. */
  get mensajesEnMemoria() {
    return this.memoria.obtener().length;
  }
}
```

### 3. `src/util/consola.ts` — ✏️ modificado

**Por qué:** Se agrega `crearLector()` para poder conversar por teclado con el chatbot.

**Qué mirar:**

- Usa `readline/promises`, incluido en Node: sin dependencias.

**Qué cambió respecto al paso anterior:**

```diff
+ import { createInterface } from "node:readline/promises";
+ 
  const c = (n: number) => (t: string) => `\x1b[${n}m${t}\x1b[0m`;
  export const verde = c(32), amarillo = c(33), azul = c(36), rojo = c(31), gris = c(90), negrita = c(1);
  …
    console.log(`\n${negrita(verde("═".repeat(60)))}\n${negrita(t)}\n${negrita(verde("═".repeat(60)))}`);
  
+ /** Lector de consola reutilizable (para los chatbots interactivos). */
+ export function crearLector() {
+   const rl = createInterface({ input: process.stdin, output: process.stdout });
+   return { preguntar: async (t: string) => (await rl.question(t)).trim(), cerrar: () => rl.close() };
+ }
+ 
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```ts
import { createInterface } from "node:readline/promises";

const c = (n: number) => (t: string) => `\x1b[${n}m${t}\x1b[0m`;
export const verde = c(32), amarillo = c(33), azul = c(36), rojo = c(31), gris = c(90), negrita = c(1);

export const titulo = (t: string) =>
  console.log(`\n${negrita(verde("═".repeat(60)))}\n${negrita(t)}\n${negrita(verde("═".repeat(60)))}`);

/** Lector de consola reutilizable (para los chatbots interactivos). */
export function crearLector() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return { preguntar: async (t: string) => (await rl.question(t)).trim(), cerrar: () => rl.close() };
}
```

</details>

### 4. `src/niveles/nivel1-chatbot.ts` — 🆕 nuevo

**Por qué:** El ejecutable del Nivel 1. Permite elegir la memoria por argumento y tiene una demo automática.

**Qué mirar:**

- Aquí SE ELIGE la estrategia de memoria en tiempo de ejecución (`ventana`, `resumen` o completa).
- `--demo` reproduce una conversación fija: ideal para comparar estrategias sin teclear.

```ts
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
```

### 5. `src/llm/providers/mock.ts` — ✏️ modificado

**Por qué:** El mock aprende a actuar como «resumidor» para que la MemoriaResumen funcione sin internet.

**Qué mirar:**

- Ahora el mock separa el mensaje `system` del resto: así reconoce el rol que le piden.

**Qué cambió respecto al paso anterior:**

```diff
  …
      if (this.op.latenciaMs) await dormir(this.op.latenciaMs);
  
-     return this.conversar(mensajes);
+     const system = mensajes.filter((m) => m.rol === "system").map((m) => m.contenido).join(" ").toLowerCase();
+     const resto = mensajes.filter((m) => m.rol !== "system");
+ 
+     if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
+     return this.conversar(resto);
    }
  
  …
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

    if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
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
}
```

</details>

### 6. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run nivel1`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "typecheck": "tsc --noEmit",
      "nivel0": "tsx src/niveles/nivel0-llamada.ts",
+     "nivel1": "tsx src/niveles/nivel1-chatbot.ts",
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

### 7. `src/verificar.ts` — ✏️ modificado

**Por qué:** Se agregan las pruebas de este paso (2): «Strategy: intercambiar proveedor no cambia al agente»; «Memoria: completa recuerda el nombre, ventana lo olvida».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import { FallbackProvider } from "./llm/providers/fallback.js";
  import { LLMMedido } from "./llm/medido.js";
+ import { ChatAgent } from "./agentes/ChatAgent.js";
+ import { MemoriaCompleta, MemoriaVentana } from "./agentes/memoria.js";
+ import type { LLMProvider } from "./llm/types.js";
  
  let ok = 0;
  …
  }
  
+ await prueba("Strategy: intercambiar proveedor no cambia al agente", async () => {
+   const a: LLMProvider = new MockProvider({ etiqueta: "A" });
+   const b: LLMProvider = new MockProvider({ etiqueta: "B" });
+   for (const llm of [a, b]) {
+     const bot = new ChatAgent(llm, "Eres un tutor.");
+     assert.ok((await bot.responder("hola")).length > 0);
+   }
+ });
+ 
+ await prueba("Memoria: completa recuerda el nombre, ventana lo olvida", async () => {
+   const llm = new MockProvider();
+   const completa = new ChatAgent(llm, "Tutor", new MemoriaCompleta());
+   const ventana = new ChatAgent(llm, "Tutor", new MemoriaVentana(2));
+   for (const bot of [completa, ventana]) {
+     await bot.responder("Me llamo Camila");
+     await bot.responder("hablemos de otra cosa");
+     await bot.responder("y de otra más");
+   }
+   assert.match(await completa.responder("¿Cómo me llamo?"), /Camila/);
+   assert.match(await ventana.responder("¿Cómo me llamo?"), /No lo sé/);
+ });
+ 
  await prueba("Fallback: salta al siguiente proveedor cuando uno falla", async () => {
    const f = new FallbackProvider([new MockProvider({ fallar: true, etiqueta: "caido" }), new MockProvider({ etiqueta: "sano" })]);
  …
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```ts
/**
 * Autotest SIN internet ni claves (usa el MockProvider).
 * Ejecuta:  npm test
 * Si todo sale ✅, tu entorno y tu código base están listos para la clase.
 */
import assert from "node:assert/strict";
import { MockProvider } from "./llm/providers/mock.js";
import { FallbackProvider } from "./llm/providers/fallback.js";
import { LLMMedido } from "./llm/medido.js";
import { ChatAgent } from "./agentes/ChatAgent.js";
import { MemoriaCompleta, MemoriaVentana } from "./agentes/memoria.js";
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

console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
```

</details>

## ▶️ Ejecutar y comprobar

**1.** Con ventana el bot OLVIDA el nombre: mira la última respuesta.

```bash
npm run nivel1 -- ventana --demo
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 1 · Chatbot · LLM: mock · memoria: ventana(4)
════════════════════════════════════════════════════════════

Tú: Hola, me llamo Camila
Bot: ¡Hola! Soy un LLM simulado (mock). Cambia LLM_PROVIDER en .env para hablar con uno real.
   (mensajes enviados en memoria: 2)

Tú: ¿Qué es un token?
Bot: (mock) Recibí 3 mensaje(s). Tu último mensaje fue: "¿Qué es un token?"
   (mensajes enviados en memoria: 4)

Tú: ¿Y un agente?
Bot: (mock) Recibí 4 mensaje(s). Tu último mensaje fue: "¿Y un agente?"
   (mensajes enviados en memoria: 4)

Tú: Dime un dato curioso
Bot: (mock) Recibí 4 mensaje(s). Tu último mensaje fue: "Dime un dato curioso"
   (mensajes enviados en memoria: 4)

Tú: ¿Cómo me llamo?
Bot: No lo sé: no está en el historial que recibí.
   (mensajes enviados en memoria: 4)

📊 5 llamadas · ~312 tokens in / ~88 out · 2 ms · 0 errores
```

**2.** Con memoria completa SÍ lo recuerda.

```bash
npm run nivel1 -- completa --demo
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 1 · Chatbot · LLM: mock · memoria: completa
════════════════════════════════════════════════════════════

Tú: Hola, me llamo Camila
Bot: ¡Hola! Soy un LLM simulado (mock). Cambia LLM_PROVIDER en .env para hablar con uno real.
   (mensajes enviados en memoria: 2)

Tú: ¿Qué es un token?
Bot: (mock) Recibí 3 mensaje(s). Tu último mensaje fue: "¿Qué es un token?"
   (mensajes enviados en memoria: 4)

Tú: ¿Y un agente?
Bot: (mock) Recibí 5 mensaje(s). Tu último mensaje fue: "¿Y un agente?"
   (mensajes enviados en memoria: 6)

Tú: Dime un dato curioso
Bot: (mock) Recibí 7 mensaje(s). Tu último mensaje fue: "Dime un dato curioso"
   (mensajes enviados en memoria: 8)

Tú: ¿Cómo me llamo?
Bot: Te llamas Camila. ¡Lo recuerdo porque está en el historial que me enviaron!
   (mensajes enviados en memoria: 10)

📊 5 llamadas · ~401 tokens in / ~95 out · 1 ms · 0 errores
```

**3.** Modo interactivo: escribe «me llamo X», habla 4 mensajes más y pregunta «¿cómo me llamo?». Para salir escribe «salir».

```bash
npm run nivel1 -- ventana
```

## ✅ Checkpoint

Con `ventana` el bot responde «No lo sé» al final; con `completa` responde «Te llamas Camila».

Si te quedaste atrás, copia `checkpoints/paso-05/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Qué estrategia elegirías para un bot de soporte con conversaciones de 5 mensajes? ¿Y para uno que acompaña un proyecto de semanas?
- ¿Por qué MemoriaResumen necesita un LLMProvider en su constructor?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| El bot nunca recuerda nada | Estás creando un ChatAgent nuevo en cada turno (se pierde la memoria). Reutiliza la misma instancia. |

## ➡️ Siguiente paso

En el paso 6 le damos «manos» al agente: herramientas que ejecuten acciones reales.

---
[← Paso 4](04-fallback-y-comparar.md) · [Paso 6 →](06-herramientas.md)
