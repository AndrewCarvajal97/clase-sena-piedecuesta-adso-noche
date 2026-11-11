# Paso 3 · Proveedores reales: Gemini, Cohere y Groq

> **Infraestructura** · ⏱ ~20 min · [← Índice](../README.md)

## 🎯 Qué construimos

Agregar tres estrategias reales y un cliente HTTP con reintentos, y elegirlas desde .env.

## ❓ Qué problema resuelve (por qué hacemos esto)

El mock sirve para practicar, pero un agente real necesita un LLM real. Cada API tiene su propio formato (nombres de roles, URL, autenticación, forma de la respuesta). Si mezclas eso dentro del agente lo contaminas para siempre. La solución: un ADAPTADOR por proveedor que traduce nuestro formato al suyo, todo escondido tras LLMProvider.

## 🧠 Conceptos clave

- **Adaptador:** Cada clase traduce Mensaje[] → formato del proveedor → texto. Las diferencias quedan encapsuladas en un solo archivo.
- **REST sin SDK:** Usamos fetch directamente. Cero dependencias, y se ve exactamente qué se envía y se recibe.
- **Reintentos con espera exponencial:** Si el proveedor responde 429 (cuota) o 5xx (caída), se reintenta esperando cada vez más. No se reintenta un 401: no se arregla solo.
- **API «compatible con OpenAI»:** Groq usa el mismo formato que OpenAI. El mismo código sirve para muchos proveedores cambiando URL y clave.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── cohere.ts   🆕
│   │   │   ├── gemini.ts   🆕
│   │   │   ├── groq.ts   🆕
│   │   │   └── mock.ts
│   │   ├── factory.ts   ✏️
│   │   ├── medido.ts
│   │   └── types.ts
│   ├── niveles/
│   │   └── nivel0-llamada.ts
│   ├── util/
│   │   ├── consola.ts
│   │   └── http.ts   🆕
│   ├── bootstrap.ts
│   ├── config.ts
│   └── verificar.ts
├── .env.example   ✏️
├── .gitignore
├── package.json
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/util/http.ts` — 🆕 nuevo

**Por qué:** Un único lugar para hacer POST con JSON, con timeout y reintentos. Los tres proveedores lo reutilizan.

**Qué mirar:**

- Reintenta SOLO 429 y errores 5xx; un 401/403/404 falla de inmediato (reintentar no lo arregla).
- `AbortSignal.timeout`: una llamada colgada no bloquea tu agente para siempre.
- Espera exponencial: 800 ms, 1,6 s… para no martillar a un servicio ya saturado.

```ts
import { ErrorLLM } from "../llm/types.js";

/**
 * POST JSON con reintentos simples.
 * Reintenta solo cuando tiene sentido: 429 (límite de uso) y errores 5xx.
 * Es una de las "buenas prácticas de producción" que veremos en clase.
 */
export async function postJson(
  proveedor: string,
  url: string,
  headers: Record<string, string>,
  cuerpo: unknown,
  { reintentos = 2, timeoutMs = 30_000 } = {},
): Promise<any> {
  let ultimoError: ErrorLLM | undefined;

  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (resp.ok) return await resp.json();

      const detalle = (await resp.text()).slice(0, 300);
      ultimoError = new ErrorLLM(proveedor, `HTTP ${resp.status}: ${detalle}`, resp.status);

      const reintentable = resp.status === 429 || resp.status >= 500;
      if (!reintentable) throw ultimoError;
    } catch (e) {
      if (e instanceof ErrorLLM && !(e.status === 429 || (e.status ?? 0) >= 500)) throw e;
      ultimoError =
        e instanceof ErrorLLM ? e : new ErrorLLM(proveedor, `Fallo de red: ${(e as Error).message}`);
    }

    if (intento < reintentos) await dormir(800 * 2 ** intento); // espera exponencial
  }
  throw ultimoError!;
}

export const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

### 2. `src/llm/providers/gemini.ts` — 🆕 nuevo

**Por qué:** Adaptador de Google Gemini. Traduce nuestro formato al de Gemini.

**Qué mirar:**

- Gemini separa el `system` (campo systemInstruction) del resto de mensajes.
- Llama «model» al asistente: traducimos `assistant` → `model`.
- La clave va en un header (`x-goog-api-key`), nunca en la URL: las URLs quedan en logs.
- La respuesta viene en candidates[0].content.parts: aquí se extrae el texto.

```ts
import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";
import { postJson } from "../../util/http.js";

/** Estrategia #1 — Google Gemini (API REST, sin SDK). */
export class GeminiProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  ) {
    this.nombre = `gemini:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    // Gemini separa el "system" del resto y llama "model" al asistente.
    const system = mensajes.filter((m) => m.rol === "system").map((m) => m.contenido).join("\n\n");
    const contents = mensajes
      .filter((m) => m.rol !== "system")
      .map((m) => ({
        role: m.rol === "assistant" ? "model" : "user",
        parts: [{ text: m.contenido }],
      }));

    const cuerpo = {
      ...(system && { systemInstruction: { parts: [{ text: system }] } }),
      contents,
      generationConfig: {
        temperature: op.temperatura ?? 0.3,
        maxOutputTokens: op.maxTokens ?? 1024,
        ...(op.json && { responseMimeType: "application/json" }),
      },
    };

    const data = await postJson(
      this.nombre,
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelo}:generateContent`,
      { "x-goog-api-key": this.apiKey },
      cuerpo,
    );

    const texto = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("");
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía o bloqueada por filtros de seguridad");
    return texto;
  }
}
```

### 3. `src/llm/providers/cohere.ts` — 🆕 nuevo

**Por qué:** Adaptador de Cohere (API v2). Es el más parecido a nuestro formato.

**Qué mirar:**

- Acepta los roles system/user/assistant tal cual.
- Autenticación con `Authorization: Bearer <clave>`.
- El texto llega en message.content[].text.

```ts
import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";
import { postJson } from "../../util/http.js";

/** Estrategia #2 — Cohere (API v2 /chat). */
export class CohereProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.COHERE_MODEL ?? "command-a-03-2025",
  ) {
    this.nombre = `cohere:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    // Cohere v2 acepta los roles system / user / assistant tal cual.
    const cuerpo = {
      model: this.modelo,
      messages: mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
      temperature: op.temperatura ?? 0.3,
      max_tokens: op.maxTokens ?? 1024,
      ...(op.json && { response_format: { type: "json_object" } }),
    };

    const data = await postJson(
      this.nombre,
      "https://api.cohere.com/v2/chat",
      { Authorization: `Bearer ${this.apiKey}` },
      cuerpo,
    );

    const texto = data?.message?.content?.map((c: any) => c.text ?? "").join("");
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía");
    return texto;
  }
}
```

### 4. `src/llm/providers/groq.ts` — 🆕 nuevo

**Por qué:** Adaptador de Groq: modelos abiertos (Llama) con hardware muy rápido, usando la API compatible con OpenAI.

**Qué mirar:**

- La respuesta está en choices[0].message.content (formato OpenAI).
- Si mañana quieres otro proveedor compatible con OpenAI, copias este archivo y cambias URL y clave.

```ts
import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";
import { postJson } from "../../util/http.js";

/**
 * Estrategia #3 — Groq (hardware ultrarrápido, API compatible con OpenAI).
 * Dato útil: "compatible con OpenAI" significa que el mismo código sirve
 * para muchísimos otros proveedores cambiando solo la URL y la clave.
 */
export class GroqProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  ) {
    this.nombre = `groq:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    const cuerpo = {
      model: this.modelo,
      messages: mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
      temperature: op.temperatura ?? 0.3,
      max_tokens: op.maxTokens ?? 1024,
      ...(op.json && { response_format: { type: "json_object" } }),
    };

    const data = await postJson(
      this.nombre,
      "https://api.groq.com/openai/v1/chat/completions",
      { Authorization: `Bearer ${this.apiKey}` },
      cuerpo,
    );

    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía");
    return texto;
  }
}
```

### 5. `src/llm/factory.ts` — ✏️ modificado

**Por qué:** La fábrica ahora también conoce a Gemini, Cohere y Groq. Es el único archivo que cambia para «enchufar» proveedores.

**Qué mirar:**

- `clave()` valida que exista la variable y dice exactamente cuál falta.
- Los agentes (que aún ni existen) no sabrán que hay tres proveedores nuevos.

**Qué cambió respecto al paso anterior:**

```diff
  import { env } from "../config.js";
  import type { LLMProvider } from "./types.js";
+ import { GeminiProvider } from "./providers/gemini.js";
+ import { CohereProvider } from "./providers/cohere.js";
+ import { GroqProvider } from "./providers/groq.js";
  import { MockProvider } from "./providers/mock.js";
  
- export type NombreProveedor = "mock";
+ export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock";
  
  /**
-  * FÁBRICA de estrategias: convierte un texto ("mock") en un objeto LLMProvider.
+  * FÁBRICA de estrategias: convierte un texto ("groq") en un objeto LLMProvider.
   * Es el ÚNICO lugar del proyecto que conoce las clases concretas.
   * El resto del código (los agentes) solo ve la interfaz LLMProvider.
   */
  export function crearProveedor(nombre: string = env("LLM_PROVIDER") ?? "mock"): LLMProvider {
+   const clave = (variable: string) => {
+     const k = env(variable);
+     if (!k) throw new Error(`Falta ${variable} en tu archivo .env (o usa LLM_PROVIDER=mock para practicar sin claves)`);
+     return k;
+   };
+ 
    switch (nombre.toLowerCase()) {
+     case "gemini":
+       return new GeminiProvider(clave("GEMINI_API_KEY"));
+     case "cohere":
+       return new CohereProvider(clave("COHERE_API_KEY"));
+     case "groq":
+       return new GroqProvider(clave("GROQ_API_KEY"));
      case "mock":
        return new MockProvider();
      default:
-       throw new Error(`Proveedor desconocido: "${nombre}". Por ahora solo existe: mock`);
+       throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock`);
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

export type NombreProveedor = "gemini" | "cohere" | "groq" | "mock";

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
    default:
      throw new Error(`Proveedor desconocido: "${nombre}". Usa gemini | cohere | groq | mock`);
  }
}
```

</details>

### 6. `.env.example` — ✏️ modificado

**Por qué:** Ahora incluye las claves y los modelos opcionales. Cada aprendiz copia el archivo y pega SU clave.

**Qué mirar:**

- Cada clave cuesta cero en los planes gratuitos, pero es personal: no se comparte por chat.
- `GEMINI_MODEL`, `COHERE_MODEL` y `GROQ_MODEL` permiten cambiar de modelo sin tocar código (los nombres cambian con el tiempo).

**Qué cambió respecto al paso anterior:**

```diff
- # Copia este archivo como ".env" (NUNCA lo subas a GitHub: está en .gitignore).
- # Con LLM_PROVIDER=mock practicas SIN claves ni internet.
+ # Copia este archivo como ".env" y pega tus claves reales (NUNCA lo subas a GitHub).
+ # Con LLM_PROVIDER=mock puedes practicar SIN claves ni internet.
  
- LLM_PROVIDER=mock
+ LLM_PROVIDER=mock            # mock | gemini | cohere | groq
+ GEMINI_API_KEY=
+ COHERE_API_KEY=
+ GROQ_API_KEY=
  
+ # (Opcional) cambiar el modelo de cada proveedor
+ # GEMINI_MODEL=gemini-2.5-flash
+ # COHERE_MODEL=command-a-03-2025
+ # GROQ_MODEL=llama-3.3-70b-versatile
+ 
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```
# Copia este archivo como ".env" y pega tus claves reales (NUNCA lo subas a GitHub).
# Con LLM_PROVIDER=mock puedes practicar SIN claves ni internet.

LLM_PROVIDER=mock            # mock | gemini | cohere | groq
GEMINI_API_KEY=
COHERE_API_KEY=
GROQ_API_KEY=

# (Opcional) cambiar el modelo de cada proveedor
# GEMINI_MODEL=gemini-2.5-flash
# COHERE_MODEL=command-a-03-2025
# GROQ_MODEL=llama-3.3-70b-versatile
```

</details>

## ▶️ Ejecutar y comprobar

**1.** Todo compila.

```bash
npm run typecheck
```

**2.** Sigue usando mock: nada se rompió.

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

**3.** Con una clave real el MISMO Nivel 0 responde con un modelo de verdad. Claves gratis: aistudio.google.com/apikey · dashboard.cohere.com/api-keys · console.groq.com/keys.

```bash
# En .env:  LLM_PROVIDER=groq  y  GROQ_API_KEY=tu_clave
npm run nivel0
```

## ✅ Checkpoint

Con mock todo sigue igual. Con una clave real, el Nivel 0 responde con el modelo elegido sin cambiar código.

Si te quedaste atrás, copia `checkpoints/paso-03/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Cuántas líneas del Nivel 0 cambiaron al pasar de mock a Groq? (Cero.)
- ¿Por qué la clave de Gemini va en un header y no en la URL?
- ¿Por qué no se reintenta un error 401?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| Falta GROQ_API_KEY en tu archivo .env | No pusiste la clave, o estás en una carpeta distinta a la del .env. |
| HTTP 401 / 403 | Clave incorrecta, vencida o con espacios/comillas. |
| HTTP 429 | Cuota gratuita agotada: espera un minuto o usa otro proveedor (el paso 4 lo automatiza). |
| HTTP 404 (modelo no encontrado) | El proveedor renombró el modelo: define GEMINI_MODEL / COHERE_MODEL / GROQ_MODEL en .env con uno vigente. |

## ➡️ Siguiente paso

En el paso 4 hacemos que el sistema sobreviva cuando un proveedor se cae.

---
[← Paso 2](02-nivel0-config-fabrica-medidor.md) · [Paso 4 →](04-fallback-y-comparar.md)
