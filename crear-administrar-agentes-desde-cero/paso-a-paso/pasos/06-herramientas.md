# Paso 6 · Herramientas: las «manos» del agente

> **Nivel 2 · parte 1** · ⏱ ~20 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear la caja de herramientas y tres herramientas útiles (más una calculadora segura), y probarlas como código normal.

## ❓ Qué problema resuelve (por qué hacemos esto)

El LLM solo produce texto: no sabe la hora, se equivoca al sumar y no consulta nada. Necesita «manos»: funciones de TU código que pueda pedir ejecutar. Antes de conectarlas al LLM las construimos y probamos SIN LLM, como cualquier función.

## 🧠 Conceptos clave

- **Herramienta (tool):** Una función + una descripción en texto. La descripción es lo único que el LLM lee para decidir cuándo usarla.
- **CajaDeHerramientas:** Registro de herramientas: las describe para el prompt y las ejecuta con red de seguridad.
- **Entrada no confiable:** Todo lo que sale de un LLM debe tratarse como entrada de usuario. Por eso JAMÁS eval().

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts
│   │   └── memoria.ts
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
│   │   └── nivel1-chatbot.ts
│   ├── tools/
│   │   ├── basicas.ts   🆕
│   │   ├── calculadora.ts   🆕
│   │   └── herramienta.ts   🆕
│   ├── util/
│   │   ├── consola.ts
│   │   └── http.ts
│   ├── bootstrap.ts
│   ├── config.ts
│   └── verificar.ts   ✏️
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/tools/herramienta.ts` — 🆕 nuevo

**Por qué:** El contrato de una herramienta y la caja que las agrupa.

**Qué mirar:**

- `Herramienta`: nombre, descripcion, ejemploEntrada y ejecutar(). Así de simple.
- `describir()` genera el texto que se pegará en el system prompt: una línea por herramienta.
- `ejecutar()` captura los errores y los devuelve como TEXTO: una herramienta que falla jamás debe tumbar al agente (el agente puede leer el error y corregirse).

```ts
/**
 * Una HERRAMIENTA es una función normal de TypeScript + una descripción en texto.
 * La descripción es lo que el LLM "lee" para decidir cuándo usarla.
 * (¡La descripción es tan importante como el código!)
 */
export interface Herramienta {
  /** Identificador sin espacios: el LLM escribirá este nombre para invocarla. */
  nombre: string;
  /** Qué hace y cuándo usarla. Sé claro y breve. */
  descripcion: string;
  /** Ejemplo del valor de "entrada" (ayuda a los modelos pequeños). */
  ejemploEntrada: string;
  ejecutar(entrada: string): Promise<string> | string;
}

/** Caja de herramientas de un agente. */
export class CajaDeHerramientas {
  private readonly mapa = new Map<string, Herramienta>();

  constructor(herramientas: Herramienta[] = []) {
    herramientas.forEach((h) => this.agregar(h));
  }

  agregar(h: Herramienta): this {
    this.mapa.set(h.nombre, h);
    return this;
  }

  tiene(nombre: string) {
    return this.mapa.has(nombre);
  }

  nombres() {
    return [...this.mapa.keys()];
  }

  /** Texto que se pega en el system prompt para que el LLM conozca las herramientas. */
  describir(): string {
    if (!this.mapa.size) return "(sin herramientas)";
    return [...this.mapa.values()]
      .map((h) => `- ${h.nombre}: ${h.descripcion} Ejemplo de entrada: "${h.ejemploEntrada}"`)
      .join("\n");
  }

  /** Ejecuta con red de seguridad: un error de la herramienta NUNCA debe tumbar al agente. */
  async ejecutar(nombre: string, entrada: string): Promise<string> {
    const h = this.mapa.get(nombre);
    if (!h) return `Error: la herramienta "${nombre}" no existe. Herramientas válidas: ${this.nombres().join(", ")}`;
    try {
      return String(await h.ejecutar(entrada));
    } catch (e) {
      return `Error al ejecutar "${nombre}": ${(e as Error).message}`;
    }
  }
}
```

### 2. `src/tools/calculadora.ts` — 🆕 nuevo

**Por qué:** Un LLM se equivoca sumando. Esta herramienta calcula con exactitud, y lo hace SIN eval() (que permitiría ejecutar código malicioso).

**Qué mirar:**

- Un parser propio por descenso recursivo: solo entiende números, + - * / % ^ y paréntesis.
- Rechaza cualquier otro carácter con un error claro: `process.exit()` no pasa.
- La descripción le dice al LLM «úsala SIEMPRE que haya cuentas».

```ts
import type { Herramienta } from "./herramienta.js";

/**
 * Evaluador matemático SEGURO (descenso recursivo).
 * ⚠️ NUNCA uses eval() con texto que viene de un LLM: es una puerta abierta
 * para ejecutar código malicioso (inyección de prompts). Este parser solo
 * entiende números, + - * / % ^ y paréntesis.
 *
 * Gramática:  expr  := term (('+'|'-') term)*
 *             term  := pot  (('*'|'/'|'%') pot)*
 *             pot   := unario ('^' pot)?
 *             unario:= '-' unario | '(' expr ')' | número
 */
export function evaluar(texto: string): number {
  const s = texto.replace(/\s+/g, "").replace(/,/g, ".");
  if (!/^[\d+\-*/%^().]+$/.test(s)) throw new Error(`Caracteres no permitidos en "${texto}"`);
  let i = 0;

  const peek = () => s[i];
  const expr = (): number => {
    let v = term();
    while (peek() === "+" || peek() === "-") v = s[i++] === "+" ? v + term() : v - term();
    return v;
  };
  const term = (): number => {
    let v = pot();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = s[i++];
      const d = pot();
      if ((op === "/" || op === "%") && d === 0) throw new Error("División por cero");
      v = op === "*" ? v * d : op === "/" ? v / d : v % d;
    }
    return v;
  };
  const pot = (): number => {
    const base = unario();
    if (peek() === "^") {
      i++;
      return base ** pot();
    }
    return base;
  };
  const unario = (): number => {
    if (peek() === "-") {
      i++;
      return -unario();
    }
    if (peek() === "(") {
      i++;
      const v = expr();
      if (s[i++] !== ")") throw new Error("Falta cerrar paréntesis");
      return v;
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`Se esperaba un número en la posición ${i}`);
    i += m[0].length;
    return parseFloat(m[0]);
  };

  const resultado = expr();
  if (i < s.length) throw new Error(`Sobra texto desde la posición ${i}: "${s.slice(i)}"`);
  return resultado;
}

export const calculadora: Herramienta = {
  nombre: "calculadora",
  descripcion: "Resuelve operaciones matemáticas (+ - * / % ^ y paréntesis). Úsala SIEMPRE que haya cuentas; los LLM se equivocan sumando.",
  ejemploEntrada: "(12 + 8) * 3",
  ejecutar: (entrada) => {
    const r = evaluar(entrada);
    return `${entrada.trim()} = ${Number.isInteger(r) ? r : r.toFixed(4).replace(/0+$/, "")}`;
  },
};
```

### 3. `src/tools/basicas.ts` — 🆕 nuevo

**Por qué:** Tres herramientas para practicar: hora (el LLM no sabe la fecha), clima (datos de ejemplo) y buscar_conocimiento (antesala de RAG).

**Qué mirar:**

- El clima usa datos de ejemplo a propósito: la clase funciona sin internet. El reto del paso 12 lo reemplaza por datos reales.
- Cada descripción explica qué hace, qué recibe y un ejemplo de entrada.
- Los errores (ciudad desconocida) se lanzan con `throw`: la caja los convertirá en observación.

```ts
import type { Herramienta } from "./herramienta.js";

/** Hora actual en Colombia. Un LLM NO sabe la fecha de hoy: hay que dársela con una herramienta. */
export const hora: Herramienta = {
  nombre: "hora",
  descripcion: "Devuelve la fecha y hora actual en Colombia. No necesita entrada.",
  ejemploEntrada: "",
  ejecutar: () =>
    new Intl.DateTimeFormat("es-CO", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(new Date()),
};

/**
 * Clima con datos de EJEMPLO (offline y predecible para la clase).
 * 🏆 Reto: reemplázala por una llamada real a https://open-meteo.com (no pide clave).
 */
const CLIMAS: Record<string, string> = {
  bogota: "14 °C, nublado",
  bucaramanga: "24 °C, parcialmente soleado",
  piedecuesta: "25 °C, soleado",
  medellin: "22 °C, lluvias ligeras",
  cali: "27 °C, soleado",
  cartagena: "31 °C, húmedo",
};
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const clima: Herramienta = {
  nombre: "clima",
  descripcion: "Consulta el clima actual de una ciudad colombiana. La entrada es SOLO el nombre de la ciudad.",
  ejemploEntrada: "Bucaramanga",
  ejecutar: (ciudad) => {
    const dato = CLIMAS[sinTildes(ciudad)];
    if (!dato) throw new Error(`No tengo datos de "${ciudad}". Ciudades: ${Object.keys(CLIMAS).join(", ")}`);
    return `Clima en ${ciudad.trim()}: ${dato} (datos de ejemplo)`;
  },
};

/** Mini base de conocimiento: antesala de RAG (clase 4 del curso). */
const CONOCIMIENTO: { claves: string[]; texto: string }[] = [
  { claves: ["agente", "agentes"], texto: "Un agente es un programa que usa un LLM para decidir qué acciones tomar (herramientas) en un bucle hasta cumplir un objetivo." },
  { claves: ["llm", "modelo de lenguaje"], texto: "Un LLM es un modelo entrenado con enormes cantidades de texto que predice el siguiente token; por eso puede conversar, resumir y razonar." },
  { claves: ["token", "tokens"], texto: "Un token es un trozo de texto (≈ 4 caracteres). Los proveedores cobran y limitan el uso por tokens de entrada y salida." },
  { claves: ["strategy", "estrategia"], texto: "Strategy es un patrón de diseño: varias clases intercambiables que cumplen la misma interfaz, elegidas en tiempo de ejecución." },
  { claves: ["react"], texto: "ReAct (Reason + Act) es un patrón donde el agente alterna: pensar, actuar con una herramienta y observar el resultado, en bucle." },
  { claves: ["rag"], texto: "RAG (Retrieval-Augmented Generation) busca fragmentos relevantes en tus documentos y se los entrega al LLM para que responda con datos reales." },
  { claves: ["prompt", "system prompt"], texto: "El system prompt son las instrucciones permanentes del agente: su rol, reglas y formato de respuesta." },
];

export const buscarConocimiento: Herramienta = {
  nombre: "buscar_conocimiento",
  descripcion: "Busca definiciones de términos de IA (agente, llm, token, strategy, react, rag, prompt). La entrada es el término.",
  ejemploEntrada: "token",
  ejecutar: (consulta) => {
    const q = sinTildes(consulta);
    const hallado = CONOCIMIENTO.find((c) => c.claves.some((k) => q.includes(k) || k.includes(q)));
    if (!hallado) throw new Error(`No encontré "${consulta}" en la base de conocimiento`);
    return hallado.texto;
  },
};
```

### 4. `src/verificar.ts` — ✏️ modificado

**Por qué:** Nuevas pruebas: la calculadora respeta precedencia y paréntesis, y rechaza código malicioso y divisiones por cero.

**Qué mirar:**

- Probar las herramientas aisladas es barato y evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
   */
  import assert from "node:assert/strict";
+ import { evaluar } from "./tools/calculadora.js";
  import { MockProvider } from "./llm/providers/mock.js";
  import { FallbackProvider } from "./llm/providers/fallback.js";
  …
  }
  
+ await prueba("Calculadora: precedencia, paréntesis y potencias", () => {
+   assert.equal(evaluar("2 + 3 * 4"), 14);
+   assert.equal(evaluar("(12 + 8) * 3"), 60);
+   assert.equal(evaluar("2 ^ 3 ^ 2"), 512);
+   assert.equal(evaluar("-5 + 10 / 4"), -2.5);
+ });
+ 
+ await prueba("Calculadora: rechaza código malicioso y divisiones por cero", () => {
+   assert.throws(() => evaluar("process.exit()"));
+   assert.throws(() => evaluar("1/0"));
+ });
+ 
  await prueba("Strategy: intercambiar proveedor no cambia al agente", async () => {
    const a: LLMProvider = new MockProvider({ etiqueta: "A" });
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
import { evaluar } from "./tools/calculadora.js";
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

**1.** Ahora hay 4 pruebas: las dos de la calculadora son nuevas.

```bash
npm test
```

**Debes ver:**

```
✅ Calculadora: precedencia, paréntesis y potencias
✅ Calculadora: rechaza código malicioso y divisiones por cero
✅ Strategy: intercambiar proveedor no cambia al agente
✅ Memoria: completa recuerda el nombre, ventana lo olvida
✅ Fallback: salta al siguiente proveedor cuando uno falla
✅ Fallback: error claro si TODOS fallan
✅ LLMMedido: cuenta llamadas y respeta el presupuesto

🎉 7 pruebas pasaron. ¡Entorno listo!
```

## ✅ Checkpoint

Las pruebas de la calculadora pasan, incluida la que rechaza `process.exit()`.

Si te quedaste atrás, copia `checkpoints/paso-06/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Por qué es peligroso usar eval() con texto que viene de un LLM?
- ¿Por qué la descripción de una herramienta es tan importante como su código?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| Se esperaba un número en la posición N | La expresión tiene un formato inválido, por ejemplo dos operadores seguidos. |

## ➡️ Siguiente paso

En el paso 7 conectamos estas herramientas al LLM con un protocolo JSON y construimos el primer agente que las usa.

---
[← Paso 5](05-nivel1-chatbot-memoria.md) · [Paso 7 →](07-protocolo-json-toolagent.md)
