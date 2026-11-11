# Paso 2 · Configuración, fábrica, medidor y el Nivel 0

> **Nivel 0 · parte 2** · ⏱ ~20 min · [← Índice](../README.md)

## 🎯 Qué construimos

Elegir el proveedor desde .env, medir llamadas y tokens, y demostrar con código que un LLM NO tiene memoria.

## ❓ Qué problema resuelve (por qué hacemos esto)

Ya hay contrato, pero faltan tres cosas: (1) elegir el proveedor desde configuración y no desde el código; (2) saber cuánto cuesta cada llamada antes de que llegue la factura; (3) ver con tus propios ojos que cada llamada nace de cero.

## 🧠 Conceptos clave

- **.env y process.loadEnvFile:** Variables de configuración y secretos fuera del código. Node 20.12+ las lee sin instalar «dotenv».
- **Fábrica (Factory):** Convierte un texto («groq») en un objeto LLMProvider. Es el ÚNICO archivo que conoce las clases concretas.
- **Decorator (LLMMedido):** Envuelve cualquier proveedor y le agrega métricas y un tope de llamadas sin modificarlo.
- **Sin estado (stateless):** Cada llamada es independiente. La «memoria» es reenviar mensajes anteriores.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── llm/
│   │   ├── providers/
│   │   │   └── mock.ts
│   │   ├── factory.ts   🆕
│   │   ├── medido.ts   🆕
│   │   └── types.ts
│   ├── niveles/
│   │   └── nivel0-llamada.ts   🆕
│   ├── util/
│   │   └── consola.ts   🆕
│   ├── bootstrap.ts   🆕
│   ├── config.ts   🆕
│   └── verificar.ts   🆕
├── .env.example   🆕
├── .gitignore
├── package.json   ✏️
└── tsconfig.json
```

## 🛠️ Antes de empezar

```bash
copy .env.example .env     # Mac/Linux: cp .env.example .env   (lo crearás tras escribir el archivo)
```

## 👣 Qué crear

> 🗑️ **Borra** `src/probar.ts`: era un archivo temporal.

### 1. `src/config.ts` — 🆕 nuevo

**Por qué:** Carga el archivo .env al arrancar y ofrece `env()` para leer variables. Centraliza la configuración en un solo punto.

**Qué mirar:**

- `process.loadEnvFile` viene incluido en Node 20.12+: cero dependencias extra.
- `env(nombre)` devuelve undefined si la variable está vacía, para poder usar `??` con valores por defecto.

```ts
import { existsSync } from "node:fs";

/** Carga el archivo .env (Node 20.12+ lo trae incorporado, sin instalar "dotenv"). */
if (existsSync(".env")) process.loadEnvFile(".env");

export const env = (nombre: string): string | undefined => process.env[nombre]?.trim() || undefined;
```

### 2. `src/util/consola.ts` — 🆕 nuevo

**Por qué:** Colores y un título para que la salida en consola sea legible en clase. Puro «azúcar» de presentación.

**Qué mirar:**

- Los códigos \x1b[...m son secuencias ANSI que cualquier terminal moderna entiende.

```ts
const c = (n: number) => (t: string) => `\x1b[${n}m${t}\x1b[0m`;
export const verde = c(32), amarillo = c(33), azul = c(36), rojo = c(31), gris = c(90), negrita = c(1);

export const titulo = (t: string) =>
  console.log(`\n${negrita(verde("═".repeat(60)))}\n${negrita(t)}\n${negrita(verde("═".repeat(60)))}`);
```

### 3. `src/llm/factory.ts` — 🆕 nuevo

**Por qué:** La fábrica de estrategias. Lee LLM_PROVIDER y entrega el proveedor correspondiente. Es el único lugar donde aparece `new MockProvider()`.

**Qué mirar:**

- El resto del proyecto llamará a `crearProveedor()` y recibirá un `LLMProvider`: no sabrá qué hay detrás.
- El valor por defecto es «mock»: si olvidas configurar, nada se rompe ni se gasta dinero.
- Si el nombre no existe, el error dice cuáles existen: mensajes de error útiles ahorran preguntas.

```ts
import { env } from "../config.js";
import type { LLMProvider } from "./types.js";
import { MockProvider } from "./providers/mock.js";

export type NombreProveedor = "mock";

/**
 * FÁBRICA de estrategias: convierte un texto ("mock") en un objeto LLMProvider.
 * Es el ÚNICO lugar del proyecto que conoce las clases concretas.
 * El resto del código (los agentes) solo ve la interfaz LLMProvider.
 */
export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
  switch (nombre.toLowerCase()) {
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Por ahora solo existe: mock`);
  }
}
```

### 4. `src/llm/medido.ts` — 🆕 nuevo

**Por qué:** Un contador de llamadas, tokens y tiempo, con tope de seguridad. Si un agente se descontrola, el tope lo detiene antes de gastar tu cuota.

**Qué mirar:**

- Patrón Decorator: recibe un `LLMProvider` y TAMBIÉN es un `LLMProvider`. Por eso se puede poner sobre cualquier proveedor.
- `estimarTokens`: ≈ 4 caracteres por token. No es exacto, pero basta para vigilar costos.
- `maxLlamadas`: lanza «Presupuesto agotado» al pasarse. Es nuestro primer límite de administración.
- El `finally` mide el tiempo incluso cuando la llamada falla.

```ts
import type { LLMProvider, Mensaje, OpcionesChat } from "./types.js";

/** Estimación rápida: ~4 caracteres ≈ 1 token (suficiente para controlar costos en clase). */
export const estimarTokens = (t: string) => Math.ceil(t.length / 4);

/**
 * Patrón DECORATOR: envuelve cualquier proveedor y le agrega métricas
 * (llamadas, tokens estimados, tiempo) sin modificar el proveedor original.
 * Esto es "administrar" agentes: lo que no se mide, no se controla.
 */
export class LLMMedido implements LLMProvider {
  llamadas = 0;
  tokensEntrada = 0;
  tokensSalida = 0;
  msTotal = 0;
  errores = 0;

  constructor(
    private readonly interno: LLMProvider,
    /** Tope de llamadas: protege tu cuota y tu bolsillo de un agente descontrolado. */
    private readonly maxLlamadas = Infinity,
  ) {}

  get nombre() {
    return this.interno.nombre;
  }

  async chat(mensajes: Mensaje[], op?: OpcionesChat): Promise<string> {
    if (this.llamadas >= this.maxLlamadas) {
      throw new Error(`Presupuesto agotado: máximo ${this.maxLlamadas} llamadas al LLM`);
    }
    this.llamadas++;
    this.tokensEntrada += estimarTokens(mensajes.map((m) => m.contenido).join(""));
    const t0 = Date.now();
    try {
      const r = await this.interno.chat(mensajes, op);
      this.tokensSalida += estimarTokens(r);
      return r;
    } catch (e) {
      this.errores++;
      throw e;
    } finally {
      this.msTotal += Date.now() - t0;
    }
  }

  resumen(): string {
    return `📊 ${this.llamadas} llamadas · ~${this.tokensEntrada} tokens in / ~${this.tokensSalida} out · ${this.msTotal} ms · ${this.errores} errores`;
  }
}
```

### 5. `src/bootstrap.ts` — 🆕 nuevo

**Por qué:** Lo que todos los scripts necesitan al arrancar: crear el LLM (ya medido) y mostrar errores de forma amable.

**Qué mirar:**

- `crearLLM()` = fábrica + medidor con un solo llamado.
- `manejarErrorFatal` evita pantallas de stack-trace gigantes frente a los aprendices y sugiere usar el mock.

```ts
import { LLMMedido } from "./llm/medido.js";
import { crearProveedor } from "./llm/factory.js";

/** LLM listo para usar: el que diga LLM_PROVIDER en .env, con métricas y tope de llamadas. */
export function crearLLM(maxLlamadas = 40) {
  return new LLMMedido(crearProveedor(), maxLlamadas);
}

/** Muestra un error de forma amigable (sin stack gigante) y termina. */
export function manejarErrorFatal(e: unknown): never {
  console.error(`\n❌ ${(e as Error).message}`);
  console.error("💡 Tip: usa LLM_PROVIDER=mock en .env para practicar sin claves ni internet.");
  process.exit(1);
}
```

### 6. `src/niveles/nivel0-llamada.ts` — 🆕 nuevo

**Por qué:** El Nivel 0: una llamada simple. Aquí demostramos en vivo que el LLM no recuerda y que la memoria la creamos nosotros.

**Qué mirar:**

- Llamada 1: «me llamo Camila». Llamada 2: «¿cómo me llamo?» SIN historial → no lo sabe.
- Llamada 3: reenviamos el historial → ahora sí. La memoria es un truco nuestro, no del modelo.
- Al final imprime `llm.resumen()`: llamadas, tokens y tiempo.

```ts
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
```

### 7. `.env.example` — 🆕 nuevo

**Por qué:** Plantilla de configuración que SÍ se sube a GitHub (sin secretos). Cada persona la copia a `.env` y pone lo suyo.

**Qué mirar:**

- `LLM_PROVIDER=mock` → todo funciona sin claves.
- El `.env` real está en .gitignore.

```
# Copia este archivo como ".env" (NUNCA lo subas a GitHub: está en .gitignore).
# Con LLM_PROVIDER=mock practicas SIN claves ni internet.

LLM_PROVIDER=mock
```

### 8. `src/verificar.ts` — 🆕 nuevo

**Por qué:** Nuestras pruebas automáticas, sin internet (usan el mock). Nacen aquí y crecerán con cada paso: así nunca avanzas sobre código roto.

**Qué mirar:**

- La función `prueba()` ejecuta un bloque y muestra ✅ o ❌ sin detener las demás.
- Primera prueba: el presupuesto del LLMMedido corta la tercera llamada.

```ts
/**
 * Autotest SIN internet ni claves (usa el MockProvider).
 * Ejecuta:  npm test
 * Si todo sale ✅, tu entorno y tu código base están listos para la clase.
 */
import assert from "node:assert/strict";
import { MockProvider } from "./llm/providers/mock.js";
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

await prueba("LLMMedido: cuenta llamadas y respeta el presupuesto", async () => {
  const m = new LLMMedido(new MockProvider(), 2);
  await m.chat([{ rol: "user", contenido: "uno" }]);
  await m.chat([{ rol: "user", contenido: "dos" }]);
  await assert.rejects(() => m.chat([{ rol: "user", contenido: "tres" }]), /Presupuesto agotado/);
  assert.equal(m.llamadas, 2);
});

console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
```

### 9. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run nivel0`, `npm run test`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
    "engines": { "node": ">=20.12" },
    "scripts": {
-     "typecheck": "tsc --noEmit"
+     "typecheck": "tsc --noEmit",
+     "nivel0": "tsx src/niveles/nivel0-llamada.ts",
+     "test": "tsx src/verificar.ts"
    },
    "devDependencies": {
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

## ▶️ Ejecutar y comprobar

**1.** Observa las tres llamadas y el resumen final.

```bash
npm run nivel0
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 0 · Llamada simple · proveedor: mock
════════════════════════════════════════════════════════════

▶ Llamada 1: me presento
¡Hola! Soy un LLM simulado (mock). Cambia LLM_PROVIDER en .env para hablar con uno real.

▶ Llamada 2: pregunto mi nombre SIN reenviar el historial
No lo sé: no está en el historial que recibí.

👉 El modelo NO recuerda: cada llamada es independiente (sin estado).

▶ Llamada 3: ahora SÍ reenvío el historial completo
Te llamas Camila. ¡Lo recuerdo porque está en el historial que me enviaron!

👉 La 'memoria' es un truco nuestro: reenviar los mensajes anteriores.

📊 3 llamadas · ~56 tokens in / ~53 out · 0 ms · 0 errores
```

**2.** Primera prueba automática.

```bash
npm test
```

**Debes ver:**

```
✅ LLMMedido: cuenta llamadas y respeta el presupuesto

🎉 1 pruebas pasaron. ¡Entorno listo!
```

## ✅ Checkpoint

El Nivel 0 muestra «No lo sé» en la llamada 2 y «Te llamas Camila» en la 3.

Si te quedaste atrás, copia `checkpoints/paso-02/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Por qué la llamada 2 no sabe el nombre y la 3 sí? ¿Qué cambió?
- Si el historial crece a 100 mensajes, ¿qué pasa con los tokens enviados y con el costo?
- ¿Por qué el tope `maxLlamadas` es una medida de seguridad y no solo de ahorro?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| process.loadEnvFile is not a function | Tu Node es anterior a 20.12. Actualiza a Node 22 LTS. |
| Proveedor desconocido: "xyz" | Escribiste mal LLM_PROVIDER en .env. Por ahora el único válido es mock. |

## ➡️ Siguiente paso

En el paso 3 conectamos modelos reales (Gemini, Cohere y Groq) sin tocar ni una línea del Nivel 0.

---
[← Paso 1](01-contrato-llmprovider.md) · [Paso 3 →](03-proveedores-reales.md)
