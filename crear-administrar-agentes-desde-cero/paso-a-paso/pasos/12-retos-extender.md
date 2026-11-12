# Paso 12 · Retos: extender sin tocar los agentes

> **Retos** · ⏱ ~25 min · [← Índice](../README.md)

## 🎯 Qué construimos

Agregar clima real, un convertidor de moneda y un proveedor local (Ollama) sin modificar un solo agente.

## ❓ Qué problema resuelve (por qué hacemos esto)

La prueba de que la arquitectura está bien hecha: ¿puedes agregar capacidades nuevas SIN tocar lo que ya funciona? Una herramienta nueva es un archivo; un proveedor nuevo es una clase. Los agentes ni se enteran.

## 🧠 Conceptos clave

- **Abierto a extensión, cerrado a modificación:** Se agregan archivos nuevos; no se editan los agentes.
- **Open-Meteo:** API de clima sin clave: primero geocodifica la ciudad y luego pide la temperatura.
- **Ollama:** Modelos locales con API compatible con OpenAI: otra estrategia casi idéntica a Groq.

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
│   │   ├── Orquestador.ts
│   │   ├── PlanificadorAgent.ts
│   │   ├── protocolo.ts
│   │   ├── ReActAgent.ts
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
│   │   ├── nivel3-react.ts
│   │   ├── nivel3b-skills.ts
│   │   ├── nivel4-planificador.ts
│   │   └── nivel5-multiagente.ts
│   ├── skills/
│   │   └── biblioteca.ts
│   ├── soluciones/
│   │   ├── climaReal.ts   🆕
│   │   ├── convertirMoneda.ts   🆕
│   │   ├── ollama.ts   🆕
│   │   └── probar-soluciones.ts   🆕
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
│   └── verificar.ts
├── .env.example
├── .gitignore
├── package.json   ✏️
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/soluciones/climaReal.ts` — 🆕 nuevo

**Por qué:** Reemplaza el clima de ejemplo por datos reales (Open-Meteo, sin clave).

**Qué mirar:**

- Dos peticiones: geocodificación (ciudad → coordenadas) y pronóstico actual.
- Misma interfaz `Herramienta` y mismo nombre `clima`: el agente no nota el cambio.

```ts
/**
 * SOLUCIÓN del reto "Clima real".
 * Usa Open-Meteo (gratis, sin clave): primero convierte el nombre de la ciudad
 * en coordenadas (geocodificación) y luego pide la temperatura actual.
 *
 * Cómo usarla: en bootstrap.ts importa { climaReal } y reemplaza `clima` en la caja.
 */
import type { Herramienta } from "../tools/herramienta.js";

const CODIGOS_WMO: Record<number, string> = {
  0: "despejado", 1: "mayormente despejado", 2: "parcialmente nublado", 3: "nublado",
  45: "niebla", 51: "llovizna", 61: "lluvia ligera", 63: "lluvia", 65: "lluvia fuerte",
  80: "chubascos", 95: "tormenta eléctrica",
};

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} al consultar ${new URL(url).host}`);
  return r.json();
}

export const climaReal: Herramienta = {
  nombre: "clima",
  descripcion: "Clima actual REAL de una ciudad de Colombia. La entrada es SOLO el nombre de la ciudad.",
  ejemploEntrada: "Piedecuesta",
  ejecutar: async (ciudad) => {
    const geo = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad.trim())}&count=1&language=es&country=CO`,
    );
    const lugar = geo.results?.[0];
    if (!lugar) throw new Error(`No encontré la ciudad "${ciudad}" en Colombia`);

    const data = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lugar.latitude}&longitude=${lugar.longitude}&current=temperature_2m,weather_code`,
    );
    const { temperature_2m: temp, weather_code: codigo } = data.current;
    return `Clima en ${lugar.name}: ${temp} °C, ${CODIGOS_WMO[codigo] ?? `código WMO ${codigo}`}`;
  },
};
```

### 2. `src/soluciones/convertirMoneda.ts` — 🆕 nuevo

**Por qué:** Una herramienta nueva con tasas de ejemplo. Muestra la importancia de describir el FORMATO exacto de la entrada.

**Qué mirar:**

- La descripción dice «monto MONEDA_ORIGEN a MONEDA_DESTINO» y da un ejemplo.
- Valida el formato y devuelve errores útiles.

```ts
/**
 * SOLUCIÓN del reto "Convertidor de moneda".
 * Tasas FIJAS de ejemplo (no son valores reales de mercado).
 * Observa cómo la descripción le explica al LLM el formato exacto de la entrada.
 */
import type { Herramienta } from "../tools/herramienta.js";

const COP_POR_UNIDAD: Record<string, number> = { COP: 1, USD: 4000, EUR: 4400, MXN: 230 };

export const convertirMoneda: Herramienta = {
  nombre: "convertir_moneda",
  descripcion:
    "Convierte dinero entre COP, USD, EUR y MXN con tasas de ejemplo. " +
    'La entrada debe tener el formato "monto MONEDA_ORIGEN a MONEDA_DESTINO".',
  ejemploEntrada: "50 USD a COP",
  ejecutar: (entrada) => {
    const m = /^\s*([\d.,]+)\s*([A-Za-z]{3})\s+a\s+([A-Za-z]{3})\s*$/i.exec(entrada);
    if (!m) throw new Error('Formato inválido. Usa: "50 USD a COP"');

    const monto = parseFloat(m[1]!.replace(",", "."));
    const origen = m[2]!.toUpperCase();
    const destino = m[3]!.toUpperCase();
    const tOrigen = COP_POR_UNIDAD[origen];
    const tDestino = COP_POR_UNIDAD[destino];
    if (!tOrigen || !tDestino) throw new Error(`Monedas soportadas: ${Object.keys(COP_POR_UNIDAD).join(", ")}`);

    const resultado = (monto * tOrigen) / tDestino;
    return `${monto} ${origen} = ${resultado.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${destino} (tasa de ejemplo)`;
  },
};
```

### 3. `src/soluciones/ollama.ts` — 🆕 nuevo

**Por qué:** Una nueva estrategia LLM: un modelo local. Es la prueba de que Strategy funciona: una clase nueva, cero cambios en agentes.

**Qué mirar:**

- Casi idéntica a `groq.ts`: solo cambian URL, no requiere clave y el timeout es mayor.
- Para activarla, agrega un `case "ollama"` en factory.ts.

```ts
/**
 * SOLUCIÓN del reto "Nueva estrategia": un LLM LOCAL con Ollama (https://ollama.com).
 * Ollama expone una API compatible con OpenAI en http://localhost:11434/v1, así que el código
 * es casi idéntico al de Groq. ¡Esa es la gracia de Strategy: una clase nueva, cero cambios en los agentes!
 *
 * Cómo usarla: instala Ollama, ejecuta `ollama pull llama3.2` y en factory.ts añade:
 *     case "ollama": return new OllamaProvider();
 */
import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../llm/types.js";
import { postJson } from "../util/http.js";

export class OllamaProvider implements LLMProvider {
  readonly nombre: string;

  constructor(
    private readonly modelo = process.env.OLLAMA_MODEL ?? "llama3.2",
    private readonly baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434/v1",
  ) {
    this.nombre = `ollama:${modelo}`;
  }

  async chat(mensajes: Mensaje[], op: OpcionesChat = {}): Promise<string> {
    const data = await postJson(
      this.nombre,
      `${this.baseUrl}/chat/completions`,
      {}, // local: no necesita clave
      {
        model: this.modelo,
        messages: mensajes.map((m) => ({ role: m.rol, content: m.contenido })),
        temperature: op.temperatura ?? 0.3,
        max_tokens: op.maxTokens ?? 1024,
        ...(op.json && { response_format: { type: "json_object" } }),
      },
      { timeoutMs: 120_000 }, // los modelos locales pueden tardar más
    );

    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) throw new ErrorLLM(this.nombre, "Respuesta vacía");
    return texto;
  }
}
```

### 4. `src/soluciones/probar-soluciones.ts` — 🆕 nuevo

**Por qué:** Un script rápido para probar las soluciones (la del clima necesita internet).

**Qué mirar:**

- Ejecuta las herramientas directamente desde una CajaDeHerramientas.

```ts
/**
 * Prueba rápida de las soluciones de los retos (la del clima necesita internet).
 * Ejecuta:  npm run soluciones
 */
import "../config.js";
import { convertirMoneda } from "./convertirMoneda.js";
import { climaReal } from "./climaReal.js";
import { CajaDeHerramientas } from "../tools/herramienta.js";

const caja = new CajaDeHerramientas([convertirMoneda, climaReal]);

console.log(await caja.ejecutar("convertir_moneda", "50 USD a COP"));
console.log(await caja.ejecutar("convertir_moneda", "hola"));
console.log(await caja.ejecutar("clima", "Piedecuesta"));
console.log(await caja.ejecutar("clima", "Atlantis"));
```

### 5. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run soluciones`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "nivel5": "tsx src/niveles/nivel5-multiagente.ts",
      "comparar": "tsx src/niveles/comparar-proveedores.ts",
-     "test": "tsx src/verificar.ts"
+     "test": "tsx src/verificar.ts",
+     "soluciones": "tsx src/soluciones/probar-soluciones.ts"
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
    "nivel1": "tsx src/niveles/nivel1-chatbot.ts",
    "nivel2": "tsx src/niveles/nivel2-herramientas.ts",
    "nivel3": "tsx src/niveles/nivel3-react.ts",
    "skills": "tsx src/niveles/nivel3b-skills.ts",
    "nivel4": "tsx src/niveles/nivel4-planificador.ts",
    "nivel5": "tsx src/niveles/nivel5-multiagente.ts",
    "comparar": "tsx src/niveles/comparar-proveedores.ts",
    "test": "tsx src/verificar.ts",
    "soluciones": "tsx src/soluciones/probar-soluciones.ts"
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

**1.** El clima real necesita internet; los valores cambian.

```bash
npm run soluciones
```

**Debes ver (los valores pueden variar):**

```
50 USD = 200.000 COP (tasa de ejemplo)
Error al ejecutar "convertir_moneda": Formato inválido. Usa: "50 USD a COP"
Clima en Piedecuesta: 26 °C, nublado
Clima en Atlantis: 23.4 °C, nublado
```

## ✅ Checkpoint

Las soluciones se ejecutan. El proyecto de este paso es IDÉNTICO al proyecto final de la clase.

Si te quedaste atrás, copia `checkpoints/paso-12/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Cuántos archivos de agentes tuviste que modificar para agregar el clima real? (Ninguno.)
- ¿Qué agregarías para que el orquestador tenga un tercer especialista?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| HTTP … al consultar open-meteo | Sin internet o el servicio no responde. El error vuelve como observación y el agente no se cae. |

## ➡️ Siguiente paso

¡Terminaste! Ahora repasa la lista de administración y agrega tus propios agentes, herramientas y skills.

---
[← Paso 11](11-nivel5-multiagente.md)
