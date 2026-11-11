# Paso 1 · El contrato LLMProvider y un LLM de mentira

> **Nivel 0 · parte 1** · ⏱ ~15 min · [← Índice](../README.md)

## 🎯 Qué construimos

Definir la interfaz común de todos los LLM y crear el primer «proveedor»: un mock que funciona sin internet.

## ❓ Qué problema resuelve (por qué hacemos esto)

Cada proveedor (Gemini, Cohere, Groq) usa un formato distinto. Si tu agente habla directamente con uno, cambiar de proveedor significa reescribir todo, y no puedes practicar sin internet ni gastar cuota. La solución es definir UNA interfaz y que todo dependa de ella: el patrón Strategy.

## 🧠 Conceptos clave

- **Patrón Strategy:** Varias clases intercambiables que cumplen la misma interfaz. El agente solo conoce la interfaz, nunca la clase concreta.
- **Mensaje y roles:** Una conversación es una lista de mensajes con rol: system (reglas), user (la persona) y assistant (el modelo).
- **Mock:** Un «LLM falso» con reglas simples. Permite desarrollar, probar y dar la clase sin claves ni internet.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── llm/
│   │   ├── providers/
│   │   │   └── mock.ts   🆕
│   │   └── types.ts   🆕
│   └── probar.ts   🆕
├── .gitignore
├── package.json
└── tsconfig.json
```

## 👣 Qué crear

> 🗑️ **Borra** `src/hola.ts`: era un archivo temporal.

### 1. `src/llm/types.ts` — 🆕 nuevo

**Por qué:** El contrato. Define cómo se ve un mensaje y qué debe saber hacer cualquier LLM: recibir mensajes y devolver texto.

**Qué mirar:**

- `Mensaje { rol, contenido }` es NUESTRO formato único. Cada proveedor lo traducirá al suyo.
- `LLMProvider` solo tiene dos miembros: `nombre` y `chat()`. Entra una lista de mensajes, sale TEXTO. Es todo lo que un agente necesita.
- `OpcionesChat`: temperatura, maxTokens y json, que casi todos los modelos entienden.
- `ErrorLLM`: un error propio para distinguir fallos de red/API de nuestros bugs (lo usaremos en reintentos y fallback).

```ts
/**
 * ============================================================
 *  PATRÓN STRATEGY — la interfaz común de TODOS los LLM
 * ============================================================
 *  Idea: el agente NO sabe si habla con Gemini, Cohere o Groq.
 *  Solo sabe que existe algo con un método `chat()`.
 *  Cada proveedor es una "estrategia" intercambiable.
 */

/** Quién habla en la conversación. */
export type Rol = "system" | "user" | "assistant";

/** Un mensaje de la conversación. */
export interface Mensaje {
  rol: Rol;
  contenido: string;
}

/** Opciones que casi todos los LLM entienden. */
export interface OpcionesChat {
  /** 0 = muy predecible, 1 = más creativo. */
  temperatura?: number;
  /** Límite de tokens de la respuesta. */
  maxTokens?: number;
  /** Pedirle al modelo que responda SOLO JSON (si el proveedor lo soporta). */
  json?: boolean;
}

/** Contrato que cumple cada estrategia (Gemini, Cohere, Groq, Mock…). */
export interface LLMProvider {
  /** Nombre legible, útil para logs y comparaciones. */
  readonly nombre: string;
  /** Recibe la conversación y devuelve el TEXTO de la respuesta. */
  chat(mensajes: Mensaje[], opciones?: OpcionesChat): Promise<string>;
}

/** Error propio para distinguir fallos de red / API del resto. */
export class ErrorLLM extends Error {
  constructor(
    public readonly proveedor: string,
    mensaje: string,
    public readonly status?: number,
  ) {
    super(`[${proveedor}] ${mensaje}`);
    this.name = "ErrorLLM";
  }
}
```

### 2. `src/llm/providers/mock.ts` — 🆕 nuevo

**Por qué:** Nuestra primera estrategia concreta. No es inteligente: responde con reglas simples. Sirve para desarrollar sin internet, hacer pruebas repetibles y no gastar cuota.

**Qué mirar:**

- `implements LLMProvider`: TypeScript obliga a cumplir el contrato; si olvidas `chat()` no compila.
- `conversar()`: si en el historial hay «me llamo X» y preguntan «¿cómo me llamo?», responde X. Así demostraremos que la «memoria» es el historial que TÚ reenvías.
- Por ahora solo conversa. El mock crecerá en cada paso para entender cada nueva capacidad.

```ts
import type { LLMProvider, Mensaje } from "../types.js";

interface OpcionesMock {
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

### 3. `src/probar.ts` — 🆕 nuevo

**Por qué:** Un script de prueba temporal para ver nuestro mock en acción. Lo borraremos en el paso 2 cuando exista el primer nivel real.

**Qué mirar:**

- Usa `await` en el nivel superior (posible porque el proyecto es ESM).
- Fíjate: el código que llama no sabe nada de cómo responde el mock; solo usa `chat()`.

```ts
import { MockProvider } from "./llm/providers/mock.js";

// Script de prueba TEMPORAL: lo borraremos en el paso 2.
const llm = new MockProvider();

const respuesta = await llm.chat([{ rol: "user", contenido: "Hola, me llamo Camila" }]);
console.log(respuesta);
```

## ▶️ Ejecutar y comprobar

**1.** Debe imprimir el saludo del mock.

```bash
npx tsx src/probar.ts
```

**Debes ver:**

```
¡Hola! Soy un LLM simulado (mock). Cambia LLM_PROVIDER en .env para hablar con uno real.
```

**2.** Sin errores.

```bash
npm run typecheck
```

## ✅ Checkpoint

Ves el saludo «Soy un LLM simulado (mock)». Ya tenemos un contrato y una implementación.

Si te quedaste atrás, copia `checkpoints/paso-01/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- Mañana quieres usar Gemini: ¿qué archivo del «agente» tendrías que modificar? (Ninguno: solo crear otra clase que implemente LLMProvider.)
- ¿Por qué `chat()` devuelve un string y no un objeto complejo?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| Cannot find module './llm/providers/mock.js' | En ESM con TypeScript se importa con extensión .js aunque el archivo sea .ts. Es normal. |
| Class 'MockProvider' incorrectly implements interface 'LLMProvider' | Falta `nombre` o `chat()`, o su firma no coincide con el contrato. |

## ➡️ Siguiente paso

En el paso 2 elegimos el proveedor desde un archivo .env, medimos cada llamada y construimos el Nivel 0.

---
[← Paso 0](00-preparar-proyecto.md) · [Paso 2 →](02-nivel0-config-fabrica-medidor.md)
