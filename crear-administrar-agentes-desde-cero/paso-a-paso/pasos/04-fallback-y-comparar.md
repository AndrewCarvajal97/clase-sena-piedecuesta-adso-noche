# Paso 4 · Resiliencia: Fallback y comparar proveedores

> **Infraestructura** · ⏱ ~15 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear una estrategia compuesta que prueba varios proveedores en orden y comparar la misma pregunta entre todos.

## ❓ Qué problema resuelve (por qué hacemos esto)

Los proveedores fallan: se acaba la cuota (429), hay caídas (503) o van lentos. Si tu agente depende de uno solo, tu sistema se cae con él. La solución es una estrategia COMPUESTA: prueba varios en orden y, como también implementa LLMProvider, el agente ni se entera.

## 🧠 Conceptos clave

- **Composite / Fallback:** Una estrategia que contiene otras estrategias y las prueba en cadena.
- **Bitácora:** Registro de a quién se le pidió y qué pasó. Imprescindible para entender por qué una respuesta vino de donde vino.
- **Fallos simulados:** El mock ahora puede fallar a propósito para practicar la resiliencia sin esperar a que un proveedor real se caiga.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── cohere.ts
│   │   │   ├── fallback.ts   🆕
│   │   │   ├── gemini.ts
│   │   │   ├── groq.ts
│   │   │   └── mock.ts   ✏️
│   │   ├── factory.ts   ✏️
│   │   ├── medido.ts
│   │   └── types.ts
│   ├── niveles/
│   │   ├── comparar-proveedores.ts   🆕
│   │   └── nivel0-llamada.ts
│   ├── util/
│   │   ├── consola.ts
│   │   └── http.ts
│   ├── bootstrap.ts
│   ├── config.ts
│   └── verificar.ts   ✏️
├── .env.example   ✏️
├── .gitignore
├── package.json   ✏️
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/llm/providers/fallback.ts` — 🆕 nuevo

**Por qué:** Recibe una lista de proveedores y le pide a cada uno en orden hasta que uno responda. Si todos fallan, lanza un error que explica cada falla.

**Qué mirar:**

- `implements LLMProvider`: se usa EXACTAMENTE igual que un proveedor normal.
- `bitacora`: guarda ✅/❌ por cada intento, útil para mostrar en clase.
- El error final junta los mensajes de todos los intentos: depurar sin adivinar.

```ts
import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";

/**
 * Estrategia COMPUESTA — prueba varios proveedores en orden.
 * Si el primero falla (límite de cuota, caída, timeout…), pasa al siguiente.
 * Observa: ¡también implementa LLMProvider! El agente no nota la diferencia.
 */
export class FallbackProvider implements LLMProvider {
  readonly nombre: string;
  /** Registro de a quién se le pidió y qué pasó (para mostrar en clase). */
  readonly bitacora: string[] = [];

  constructor(private readonly cadena: LLMProvider[]) {
    if (!cadena.length) throw new Error("FallbackProvider necesita al menos un proveedor");
    this.nombre = `fallback[${cadena.map((p) => p.nombre).join(" → ")}]`;
  }

  async chat(mensajes: Mensaje[], op?: OpcionesChat): Promise<string> {
    const errores: string[] = [];
    for (const proveedor of this.cadena) {
      try {
        const respuesta = await proveedor.chat(mensajes, op);
        this.bitacora.push(`✅ ${proveedor.nombre}`);
        return respuesta;
      } catch (e) {
        const msg = (e as Error).message;
        this.bitacora.push(`❌ ${proveedor.nombre} — ${msg.slice(0, 80)}`);
        errores.push(msg);
      }
    }
    throw new ErrorLLM(this.nombre, `Todos los proveedores fallaron:\n  - ${errores.join("\n  - ")}`);
  }
}
```

### 2. `src/niveles/comparar-proveedores.ts` — 🆕 nuevo

**Por qué:** Demuestra Strategy en vivo: MISMA pregunta, distintos proveedores, mismo código. Luego demuestra el Fallback con un proveedor caído.

**Qué mirar:**

- Solo prueba los proveedores que tengan clave en .env (más el mock).
- La función `probar()` recibe un `LLMProvider`: no distingue cuál es. Eso es Strategy.
- La demo del fallback pone primero un `MockProvider({ fallar: true })` y el sistema igual responde.

```ts
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
```

### 3. `src/llm/factory.ts` — ✏️ modificado

**Por qué:** Se suma la opción `fallback`: construye la cadena según FALLBACK_ORDER usando solo los proveedores que tienen clave.

**Qué mirar:**

- Omite sin ruido los proveedores sin clave: un aprendiz con solo Groq también puede usar «fallback».
- Para el agente, `LLM_PROVIDER=fallback` es solo otro nombre más.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import { GroqProvider } from "./providers/groq.js";
  import { MockProvider } from "./providers/mock.js";
+ import { FallbackProvider } from "./providers/fallback.js";
  
- export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock";
+ export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock" | "fallback";
  
  /**
  …
      case "mock":
        return new MockProvider();
+     case "fallback": {
+       const orden = (env("FALLBACK_ORDER") ?? "groq,gemini,cohere").split(",").map((s) => s.trim());
+       // Solo incluimos los proveedores que SÍ tienen clave configurada.
+       const disponibles: LLMProvider[] = [];
+       for (const n of orden) {
+         try {
+           disponibles.push(crearProveedor(n));
+         } catch {
+           /* sin clave: se omite */
+         }
+       }
+       if (!disponibles.length) throw new Error("fallback: no hay ninguna clave configurada en .env");
+       return new FallbackProvider(disponibles);
+     }
      default:
-       throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock`);
+       throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock | fallback`);
    }
  }
  …
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```ts
import { env } from "../config.js";
import type { LLMProvider } from "./types.js";
import { GeminiProvider } from "./providers/gemini.js";
import { CohereProvider } from "./providers/cohere.js";
import { GroqProvider } from "./providers/groq.js";
import { MockProvider } from "./providers/mock.js";
import { FallbackProvider } from "./providers/fallback.js";

export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock" | "fallback";

/**
 * FÁBRICA de estrategias: convierte un texto ("groq") en un objeto LLMProvider.
 * Es el ÚNICO lugar del proyecto que conoce las clases concretas.
 * El resto del código (los agentes) solo ve la interfaz LLMProvider.
 */
export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
  const clave = (variable: string) => {
    const k = env(variable);
    if (!k) throw new Error(`Falta ${variable} en tu archivo .env (o usa LLM_PROVIDER=mock para practicar sin claves)`);
    return k;
  };

  switch (nombre.toLowerCase()) {
    case "gemini":
      return new GeminiProvider(clave("GEMINI_API_KEY"));
    case "cohere":
      return new CohereProvider(clave("COHERE_API_KEY"));
    case "groq":
      return new GroqProvider(clave("GROQ_API_KEY"));
    case "mock":
      return new MockProvider();
    case "fallback": {
      const orden = (env("FALLBACK_ORDER") ?? "groq,gemini,cohere").split(",").map((s) => s.trim());
      // Solo incluimos los proveedores que SÍ tienen clave configurada.
      const disponibles: LLMProvider[] = [];
      for (const n of orden) {
        try {
          disponibles.push(crearProveedor(n));
        } catch {
          /* sin clave: se omite */
        }
      }
      if (!disponibles.length) throw new Error("fallback: no hay ninguna clave configurada en .env");
      return new FallbackProvider(disponibles);
    }
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock | fallback`);
  }
}
```

</details>

### 4. `src/llm/providers/mock.ts` — ✏️ modificado

**Por qué:** El mock aprende a fallar y a ser lento a voluntad, para poder practicar el fallback sin depender de un servicio real.

**Qué mirar:**

- `fallar: true` lanza un ErrorLLM 503 simulado.
- `latenciaMs` simula un proveedor lento.
- `etiqueta` permite distinguir varios mocks en la bitácora.

**Qué cambió respecto al paso anterior:**

```diff
- import type { LLMProvider, Mensaje } from "../types.js";
+ import { ErrorLLM, type LLMProvider, type Mensaje } from "../types.js";
+ import { dormir } from "../../util/http.js";
  
  interface OpcionesMock {
+   /** Simula una caída del proveedor (para practicar el fallback). */
+   fallar?: boolean;
+   /** Latencia artificial en milisegundos. */
+   latenciaMs?: number;
    /** Nombre visible (útil cuando creas varios mocks). */
    etiqueta?: string;
  …
  
    async chat(mensajes: Mensaje[]): Promise<string> {
+     if (this.op.fallar) throw new ErrorLLM(this.nombre, "Fallo simulado (503 servicio no disponible)", 503);
+     if (this.op.latenciaMs) await dormir(this.op.latenciaMs);
+ 
      return this.conversar(mensajes);
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

    return this.conversar(mensajes);
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

### 5. `.env.example` — ✏️ modificado

**Por qué:** Se agrega el orden de la cadena de respaldo.

**Qué mirar:**

- `FALLBACK_ORDER=groq,gemini,cohere`: el primero que responda gana.

**Qué cambió respecto al paso anterior:**

```diff
  …
  # Con LLM_PROVIDER=mock puedes practicar SIN claves ni internet.
  
- LLM_PROVIDER=mock            # mock | gemini | cohere | groq
+ LLM_PROVIDER=mock            # mock | gemini | cohere | groq | fallback
  GEMINI_API_KEY=
  COHERE_API_KEY=
  …
  # GROQ_MODEL=llama-3.3-70b-versatile
  
+ # Orden de la estrategia "fallback" (el primero que responda gana)
+ FALLBACK_ORDER=groq,gemini,cohere
+ 
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```
# Copia este archivo como ".env" y pega tus claves reales (NUNCA lo subas a GitHub).
# Con LLM_PROVIDER=mock puedes practicar SIN claves ni internet.

LLM_PROVIDER=mock            # mock | gemini | cohere | groq | fallback
GEMINI_API_KEY=
COHERE_API_KEY=
GROQ_API_KEY=

# (Opcional) cambiar el modelo de cada proveedor
# GEMINI_MODEL=gemini-2.5-flash
# COHERE_MODEL=command-a-03-2025
# GROQ_MODEL=llama-3.3-70b-versatile

# Orden de la estrategia "fallback" (el primero que responda gana)
FALLBACK_ORDER=groq,gemini,cohere
```

</details>

### 6. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run comparar`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "typecheck": "tsc --noEmit",
      "nivel0": "tsx src/niveles/nivel0-llamada.ts",
+     "comparar": "tsx src/niveles/comparar-proveedores.ts",
      "test": "tsx src/verificar.ts"
    },
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

**Por qué:** Se agregan las pruebas de este paso (2): «Fallback: salta al siguiente proveedor cuando uno falla»; «Fallback: error claro si TODOS fallan».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import assert from "node:assert/strict";
  import { MockProvider } from "./llm/providers/mock.js";
+ import { FallbackProvider } from "./llm/providers/fallback.js";
  import { LLMMedido } from "./llm/medido.js";
  
  …
  }
  
+ await prueba("Fallback: salta al siguiente proveedor cuando uno falla", async () => {
+   const f = new FallbackProvider([new MockProvider({ fallar: true, etiqueta: "caido" }), new MockProvider({ etiqueta: "sano" })]);
+   assert.ok((await f.chat([{ rol: "user", contenido: "hola" }])).length > 0);
+   assert.match(f.bitacora.join("|"), /❌ caido.*\|✅ sano/);
+ });
+ 
+ await prueba("Fallback: error claro si TODOS fallan", async () => {
+   const f = new FallbackProvider([new MockProvider({ fallar: true }), new MockProvider({ fallar: true })]);
+   await assert.rejects(() => f.chat([{ rol: "user", contenido: "hola" }]), /Todos los proveedores fallaron/);
+ });
+ 
  await prueba("LLMMedido: cuenta llamadas y respeta el presupuesto", async () => {
    const m = new LLMMedido(new MockProvider(), 2);
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

**1.** Sin claves solo prueba el mock y luego demuestra el fallback.

```bash
npm run comparar
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
STRATEGY · misma pregunta, distintos proveedores
════════════════════════════════════════════════════════════
Pregunta: Explica en una sola frase qué es un agente de IA.

(omito groq: no hay GROQ_API_KEY en .env)
(omito gemini: no hay GEMINI_API_KEY en .env)
(omito cohere: no hay COHERE_API_KEY en .env)

✔ mock                               0 ms
   (mock) Recibí 1 mensaje(s). Tu último mensaje fue: "Explica en una sola frase qué es un agente de IA."


════════════════════════════════════════════════════════════
FALLBACK · el primero falla y el sistema sigue
════════════════════════════════════════════════════════════
✔ fallback[proveedor-caido → mock-respaldo] 1 ms
   (mock) Recibí 1 mensaje(s). Tu último mensaje fue: "Explica en una sola frase qué es un agente de IA."

Bitácora del fallback:
  ❌ proveedor-caido — [proveedor-caido] Fallo simulado (503 servicio no disponible)
  ✅ mock-respaldo
```

**2.** Dos pruebas nuevas de fallback.

```bash
npm test
```

**Debes ver:**

```
✅ Fallback: salta al siguiente proveedor cuando uno falla
✅ Fallback: error claro si TODOS fallan
✅ LLMMedido: cuenta llamadas y respeta el presupuesto

🎉 3 pruebas pasaron. ¡Entorno listo!
```

## ✅ Checkpoint

El fallback salta del proveedor caído al sano y la bitácora lo muestra.

Si te quedaste atrás, copia `checkpoints/paso-04/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Por qué FallbackProvider implementa LLMProvider? ¿Qué se rompería si no lo hiciera?
- ¿Qué orden pondrías en la cadena: el más rápido, el más barato o el más inteligente primero?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| fallback: no hay ninguna clave configurada en .env | Con LLM_PROVIDER=fallback necesitas al menos una clave real. Para practicar usa el mock. |

## ➡️ Siguiente paso

Con la infraestructura lista empezamos los niveles de agentes. En el paso 5: el chatbot con memoria.

---
[← Paso 3](03-proveedores-reales.md) · [Paso 5 →](05-nivel1-chatbot-memoria.md)
