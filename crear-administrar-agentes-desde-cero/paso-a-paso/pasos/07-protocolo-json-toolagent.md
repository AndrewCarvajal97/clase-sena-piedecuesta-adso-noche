# Paso 7 · El protocolo JSON y el ToolAgent

> **Nivel 2 · parte 2** · ⏱ ~25 min · [← Índice](../README.md)

## 🎯 Qué construimos

Hacer que el LLM pida herramientas usando JSON, ejecutarlas y devolverle el resultado: el primer agente de verdad.

## ❓ Qué problema resuelve (por qué hacemos esto)

El LLM no puede ejecutar nada: solo puede escribir texto. Necesitamos un idioma común para que escriba «quiero usar clima con Cali» de forma que NUESTRO código lo entienda, lo ejecute y le devuelva el resultado. Cada proveedor tiene su «function calling» propio y distinto; un protocolo JSON propio funciona igual en todos.

## 🧠 Conceptos clave

- **Protocolo JSON:** El LLM responde SIEMPRE con un objeto JSON: o {accion, entrada} o {respuesta_final}.
- **Observación:** El resultado de la herramienta, que se le devuelve al LLM como un mensaje «Observación: …».
- **Trazabilidad:** Cada paso emite un evento (pensamiento, acción, observación): imprescindible para depurar agentes.
- **Límite del Nivel 2:** Una sola herramienta por pregunta. Si la tarea necesita dos, se queda corta.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts
│   │   ├── eventos.ts   🆕
│   │   ├── memoria.ts
│   │   ├── protocolo.ts   🆕
│   │   └── ToolAgent.ts   🆕
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
│   │   └── nivel2-herramientas.ts   🆕
│   ├── tools/
│   │   ├── basicas.ts
│   │   ├── calculadora.ts
│   │   └── herramienta.ts
│   ├── util/
│   │   ├── consola.ts
│   │   ├── http.ts
│   │   └── json.ts   🆕
│   ├── bootstrap.ts   ✏️
│   ├── config.ts
│   └── verificar.ts   ✏️
├── .env.example
├── .gitignore
├── package.json   ✏️
└── tsconfig.json
```

## 👣 Qué crear

### 1. `src/util/json.ts` — 🆕 nuevo

**Por qué:** Los LLM a veces envuelven el JSON en ```json … ``` o añaden texto. Este «limpiador» encuentra el objeto JSON dentro.

**Qué mirar:**

- Quita las vallas de código y recorta entre la primera `{` y la última `}`.
- Si no hay JSON lanza un error: el agente lo manejará.

````ts
/**
 * Los LLM a veces envuelven el JSON en ```json ... ``` o añaden texto extra.
 * Esta función es el "limpiador": encuentra el primer objeto JSON válido.
 */
export function extraerJson<T = any>(texto: string): T {
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const ini = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (ini === -1 || fin <= ini) throw new Error("No encontré un objeto JSON en la respuesta");
  return JSON.parse(limpio.slice(ini, fin + 1)) as T;
}
````

### 2. `src/agentes/protocolo.ts` — 🆕 nuevo

**Por qué:** Define el protocolo: el texto que se pone en el system prompt y la función que interpreta la respuesta del LLM.

**Qué mirar:**

- `promptProtocolo()` junta: rol + lista de herramientas + las reglas del formato JSON.
- `interpretar()` devuelve un tipo seguro: acción o respuesta final. Si el JSON no cumple, lanza error.
- Funciona igual con Gemini, Cohere y Groq, sin depender de su function calling propio.

```ts
import type { CajaDeHerramientas } from "../tools/herramienta.js";
import { extraerJson } from "../util/json.js";

/**
 * EL PROTOCOLO: cómo "hablamos" con el LLM para que use herramientas.
 * Le pedimos que responda SIEMPRE en JSON con uno de dos formatos.
 * Ventaja: funciona igual en Gemini, Cohere y Groq (sin depender del
 * "function calling" nativo de cada proveedor, que cambia entre ellos).
 */
export type DecisionLLM =
  | { tipo: "accion"; pensamiento: string; accion: string; entrada: string }
  | { tipo: "final"; pensamiento: string; respuesta: string };

export function promptProtocolo(rol: string, herramientas: CajaDeHerramientas, extra = ""): string {
  return `${rol}

HERRAMIENTAS DISPONIBLES:
${herramientas.describir()}

Responde SIEMPRE con UN solo objeto JSON válido, sin texto adicional. Hay dos formatos:

1) Cuando necesites una herramienta:
{"pensamiento": "por qué la necesito", "accion": "nombre_de_la_herramienta", "entrada": "texto de entrada"}

2) Cuando ya tengas la información para responder:
{"pensamiento": "por qué ya puedo responder", "respuesta_final": "respuesta clara para el usuario"}

REGLAS:
- Usa UNA herramienta por turno. Después recibirás un mensaje que empieza con "Observación:".
- No inventes datos: si no los tienes, usa una herramienta o dilo con honestidad.
- Si una herramienta devuelve un error, corrige la entrada o intenta otra forma.
- Responde en español.${extra ? "\n" + extra : ""}`;
}

/** Convierte el texto del LLM en una decisión tipada (o lanza error si el formato es inválido). */
export function interpretar(texto: string): DecisionLLM {
  const j = extraerJson<Record<string, unknown>>(texto);
  const pensamiento = typeof j.pensamiento === "string" ? j.pensamiento : "";

  if (typeof j.respuesta_final === "string") return { tipo: "final", pensamiento, respuesta: j.respuesta_final };
  if (typeof j.accion === "string") {
    return { tipo: "accion", pensamiento, accion: j.accion, entrada: j.entrada == null ? "" : String(j.entrada) };
  }
  throw new Error('El JSON no tiene ni "accion" ni "respuesta_final"');
}
```

### 3. `src/agentes/eventos.ts` — 🆕 nuevo

**Por qué:** Cada cosa que hace un agente emite un evento. Con eventos puedes imprimir, guardar en archivo o mostrar en una web.

**Qué mirar:**

- `EventoAgente`: quién, qué tipo, en qué paso y qué texto.
- `imprimirEvento` es una «escucha» lista para usar con íconos y colores.

```ts
import { amarillo, azul, gris, rojo, verde } from "../util/consola.js";

/**
 * TRAZABILIDAD: cada cosa que hace un agente emite un evento.
 * Con eventos puedes imprimir en consola, guardar en un archivo o mostrar en una web.
 */
export interface EventoAgente {
  agente: string;
  tipo: "pensamiento" | "accion" | "observacion" | "final" | "error" | "plan" | "delegacion";
  paso: number;
  texto: string;
}

export type Escucha = (e: EventoAgente) => void;

const ICONOS: Record<EventoAgente["tipo"], (t: string) => string> = {
  pensamiento: (t) => gris(`💭 ${t}`),
  accion: (t) => azul(`🛠️  ${t}`),
  observacion: (t) => amarillo(`👁️  ${t}`),
  final: (t) => verde(`✅ ${t}`),
  error: (t) => rojo(`⚠️  ${t}`),
  plan: (t) => azul(`📋 ${t}`),
  delegacion: (t) => azul(`📨 ${t}`),
};

/** Escucha lista para usar: imprime cada evento con colores. */
export const imprimirEvento: Escucha = (e) => {
  console.log(`  ${gris(`[${e.agente} · paso ${e.paso}]`)} ${ICONOS[e.tipo](e.texto)}`);
};
```

### 4. `src/agentes/ToolAgent.ts` — 🆕 nuevo

**Por qué:** El Nivel 2: pregunta → el LLM decide → se ejecuta UNA herramienta → el LLM redacta la respuesta.

**Qué mirar:**

- Dos llamadas al LLM: una para decidir y otra para redactar con la observación.
- La herramienta la ejecuta NUESTRO código (`herramientas.ejecutar`), no el LLM.
- Si el LLM pide una segunda herramienta, responde que este nivel solo usa una: ese es su límite, y el gancho para el Nivel 3.

```ts
import type { LLMProvider, Mensaje } from "../llm/types.js";
import type { CajaDeHerramientas } from "../tools/herramienta.js";
import { interpretar, promptProtocolo } from "./protocolo.js";
import type { Escucha } from "./eventos.js";

/**
 * NIVEL 2 — Agente con herramientas (UNA sola vez).
 *   Pregunta → el LLM decide → se ejecuta UNA herramienta → el LLM redacta.
 * Es un agente "de un solo disparo": sirve para tareas simples,
 * pero falla si la pregunta necesita encadenar varias herramientas.
 */
export class ToolAgent {
  constructor(
    private readonly llm: LLMProvider,
    private readonly herramientas: CajaDeHerramientas,
    private readonly escucha: Escucha = () => {},
    private readonly nombre = "ToolAgent",
  ) {}

  async ejecutar(pregunta: string): Promise<string> {
    const system = promptProtocolo(
      "Eres un asistente útil.",
      this.herramientas,
      "- Solo puedes usar UNA herramienta en total para esta pregunta.",
    );
    const mensajes: Mensaje[] = [
      { rol: "system", contenido: system },
      { rol: "user", contenido: pregunta },
    ];

    // Llamada 1: ¿necesita herramienta?
    const crudo = await this.llm.chat(mensajes, { json: true, temperatura: 0 });
    const decision = interpretar(crudo);
    this.escucha({ agente: this.nombre, tipo: "pensamiento", paso: 1, texto: decision.pensamiento });

    if (decision.tipo === "final") return decision.respuesta;

    // Ejecutamos la herramienta (código normal, NO el LLM).
    this.escucha({ agente: this.nombre, tipo: "accion", paso: 1, texto: `${decision.accion}("${decision.entrada}")` });
    const observacion = await this.herramientas.ejecutar(decision.accion, decision.entrada);
    this.escucha({ agente: this.nombre, tipo: "observacion", paso: 1, texto: observacion });

    // Llamada 2: el LLM redacta la respuesta usando la observación.
    mensajes.push({ rol: "assistant", contenido: crudo }, { rol: "user", contenido: `Observación: ${observacion}` });
    const segunda = interpretar(await this.llm.chat(mensajes, { json: true, temperatura: 0 }));

    if (segunda.tipo === "final") return segunda.respuesta;
    // Quiso usar otra herramienta, pero este nivel no lo permite → límite del Nivel 2.
    return `(Nivel 2 solo usa una herramienta) Esto es lo que obtuve: ${observacion}`;
  }
}
```

### 5. `src/niveles/nivel2-herramientas.ts` — 🆕 nuevo

**Por qué:** El ejecutable del Nivel 2, con tres preguntas: las dos primeras funcionan; la tercera necesita dos herramientas y se queda corta.

**Qué mirar:**

- Acepta tu propia pregunta: `npm run nivel2 -- "¿Cuánto es 15% de 2400?"`.

```ts
/**
 * NIVEL 2 — Agente con herramientas (una sola herramienta por pregunta).
 *
 * Ejecuta:  npm run nivel2
 *           npm run nivel2 -- "¿Cuánto es 15% de 2400?"
 *
 * Observa la 3.ª pregunta: necesita DOS herramientas (clima + calculadora)
 * y este nivel solo puede usar una. ¡Ese es su límite! → el Nivel 3 lo resuelve.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos, todasLasHerramientas } from "../bootstrap.js";
import { ToolAgent } from "../agentes/ToolAgent.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { titulo, verde, azul } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  const agente = new ToolAgent(llm, todasLasHerramientas(), imprimirEvento, "Nivel2");
  titulo(`NIVEL 2 · Agente con herramientas · LLM: ${llm.nombre}`);

  const personalizada = preguntaDeArgumentos();
  const preguntas = personalizada
    ? [personalizada]
    : ["¿Qué hora es en Colombia?", "¿Cuánto es (12 + 8) * 3?", "¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?"];

  for (const p of preguntas) {
    console.log(`\n${azul("❓ " + p)}`);
    console.log(`${verde("➡️  Respuesta:")} ${await agente.ejecutar(p)}`);
  }
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
```

### 6. `src/bootstrap.ts` — ✏️ modificado

**Por qué:** Se agregan dos ayudas compartidas: `todasLasHerramientas()` y leer la pregunta desde los argumentos de la terminal.

**Qué mirar:**

- Una sola función arma la caja con las 4 herramientas: cualquier nivel puede reutilizarla.

**Qué cambió respecto al paso anterior:**

```diff
  import { LLMMedido } from "./llm/medido.js";
  import { crearProveedor } from "./llm/factory.js";
+ import { CajaDeHerramientas } from "./tools/herramienta.js";
+ import { calculadora } from "./tools/calculadora.js";
+ import { buscarConocimiento, clima, hora } from "./tools/basicas.js";
  
  /** LLM listo para usar: el que diga LLM_PROVIDER en .env, con métricas y tope de llamadas. */
  …
  }
  
+ /** Caja con TODAS las herramientas de la clase. */
+ export const todasLasHerramientas = () => new CajaDeHerramientas([calculadora, hora, clima, buscarConocimiento]);
+ 
+ /** Texto pasado por la terminal: `npm run nivel3 -- "tu pregunta"` */
+ export const preguntaDeArgumentos = () => process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ").trim();
+ 
  /** Muestra un error de forma amigable (sin stack gigante) y termina. */
  export function manejarErrorFatal(e: unknown): never {
  …
```

<details><summary>Ver el archivo completo (para reemplazarlo)</summary>

```ts
import { LLMMedido } from "./llm/medido.js";
import { crearProveedor } from "./llm/factory.js";
import { CajaDeHerramientas } from "./tools/herramienta.js";
import { calculadora } from "./tools/calculadora.js";
import { buscarConocimiento, clima, hora } from "./tools/basicas.js";

/** LLM listo para usar: el que diga LLM_PROVIDER en .env, con métricas y tope de llamadas. */
export function crearLLM(maxLlamadas = 40) {
  return new LLMMedido(crearProveedor(), maxLlamadas);
}

/** Caja con TODAS las herramientas de la clase. */
export const todasLasHerramientas = () => new CajaDeHerramientas([calculadora, hora, clima, buscarConocimiento]);

/** Texto pasado por la terminal: `npm run nivel3 -- "tu pregunta"` */
export const preguntaDeArgumentos = () => process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ").trim();

/** Muestra un error de forma amigable (sin stack gigante) y termina. */
export function manejarErrorFatal(e: unknown): never {
  console.error(`\n❌ ${(e as Error).message}`);
  console.error("💡 Tip: usa LLM_PROVIDER=mock en .env para practicar sin claves ni internet.");
  process.exit(1);
}
```

</details>

### 7. `src/llm/providers/mock.ts` — ✏️ modificado

**Por qué:** El mock aprende el protocolo: detecta qué herramientas hacen falta según la pregunta y responde en JSON. Así los niveles 2 y 3 funcionan sin internet.

**Qué mirar:**

- Solo considera las herramientas que el agente REALMENTE tiene (mira el prompt): así probamos también la restricción de herramientas.
- Cuenta las «Observación:» recibidas para saber en qué paso va.
- Sigue siendo reglas simples: no es un LLM, es un actor que ensaya el guion.

**Qué cambió respecto al paso anterior:**

```diff
  …
  
      if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
+     if (system.includes('"accion"')) return this.reaccionar(resto, system);
      return this.conversar(resto);
    }
  …
      return `(mock) Recibí ${msgs.length} mensaje(s). Tu último mensaje fue: "${ultimo.slice(0, 80)}"`;
    }
+ 
+   // ---------- Protocolo de herramientas (niveles 2, 3 y especialistas) ----------
+   private reaccionar(msgs: Mensaje[], system: string): string {
+     // Solo la tarea: ignoramos el bloque de contexto de pasos anteriores.
+     const pregunta = (msgs.find((m) => m.rol === "user")?.contenido ?? "").split("\n\n[Contexto")[0] ?? "";
+     const observaciones = msgs
+       .filter((m) => m.rol === "user" && m.contenido.startsWith("Observación:"))
+       .map((m) => m.contenido.replace("Observación:", "").trim());
+ 
+     // Solo considera las herramientas que el agente realmente tiene disponibles.
+     const pendientes = this.herramientasNecesarias(pregunta).filter((h) => system.includes(`- ${h.nombre}:`));
+     const siguiente = pendientes[observaciones.length];
+ 
+     if (siguiente) {
+       return JSON.stringify({
+         pensamiento: `Necesito usar "${siguiente.nombre}" para avanzar.`,
+         accion: siguiente.nombre,
+         entrada: siguiente.entrada,
+       });
+     }
+     const respuesta = observaciones.length
+       ? `Con lo que obtuve: ${observaciones.join(" | ")}`
+       : `No necesito herramientas para esto. (mock) Pregunta: ${pregunta.slice(0, 80)}`;
+     return JSON.stringify({ pensamiento: "Ya tengo lo necesario para responder.", respuesta_final: respuesta });
+   }
+ 
+   private herramientasNecesarias(texto: string) {
+     const hallazgos: { pos: number; nombre: string; entrada: string }[] = [];
+     const clima = /clima|temperatura|llueve/i.exec(texto);
+     if (clima) {
+       hallazgos.push({ pos: clima.index, nombre: "clima", entrada: /\ben ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)/.exec(texto)?.[1] ?? "Bogotá" });
+     }
+     // Expresión matemática: números, operadores y paréntesis (debe contener al menos un operador).
+     const mat = [...texto.matchAll(/\(*\d[\d\s+\-*/^%().]*[\d)]/g)].find((m) => /[+\-*/^%]/.test(m[0]));
+     if (mat) hallazgos.push({ pos: mat.index ?? 0, nombre: "calculadora", entrada: mat[0].trim() });
+     const hora = /\bhora\b/i.exec(texto);
+     if (hora) hallazgos.push({ pos: hora.index, nombre: "hora", entrada: "" });
+     const def = /qu[eé] (?:es|son) (?:un |una |el |la |los |las )?(.+?)(?:\s+y\s|[?.,;]|$)/i.exec(texto);
+     if (def) hallazgos.push({ pos: def.index, nombre: "buscar_conocimiento", entrada: def[1]!.trim() });
+     return hallazgos.sort((a, b) => a.pos - b.pos);
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
    const respuesta = observaciones.length
      ? `Con lo que obtuve: ${observaciones.join(" | ")}`
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
    const hora = /\bhora\b/i.exec(texto);
    if (hora) hallazgos.push({ pos: hora.index, nombre: "hora", entrada: "" });
    const def = /qu[eé] (?:es|son) (?:un |una |el |la |los |las )?(.+?)(?:\s+y\s|[?.,;]|$)/i.exec(texto);
    if (def) hallazgos.push({ pos: def.index, nombre: "buscar_conocimiento", entrada: def[1]!.trim() });
    return hallazgos.sort((a, b) => a.pos - b.pos);
  }
}
```

</details>

### 8. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run nivel2`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "nivel0": "tsx src/niveles/nivel0-llamada.ts",
      "nivel1": "tsx src/niveles/nivel1-chatbot.ts",
+     "nivel2": "tsx src/niveles/nivel2-herramientas.ts",
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

### 9. `src/verificar.ts` — ✏️ modificado

**Por qué:** Se agregan las pruebas de este paso (3): «extraerJson limpia bloques ```json»; «Nivel 2: usa UNA herramienta»; «Nivel 2: se queda corto con 2 herramientas (límite esperado)».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

````diff
  …
  import assert from "node:assert/strict";
  import { evaluar } from "./tools/calculadora.js";
+ import { extraerJson } from "./util/json.js";
  import { MockProvider } from "./llm/providers/mock.js";
  import { FallbackProvider } from "./llm/providers/fallback.js";
  import { LLMMedido } from "./llm/medido.js";
+ import { CajaDeHerramientas } from "./tools/herramienta.js";
+ import { calculadora } from "./tools/calculadora.js";
+ import { buscarConocimiento, clima, hora } from "./tools/basicas.js";
  import { ChatAgent } from "./agentes/ChatAgent.js";
  import { MemoriaCompleta, MemoriaVentana } from "./agentes/memoria.js";
+ import { ToolAgent } from "./agentes/ToolAgent.js";
  import type { LLMProvider } from "./llm/types.js";
  
  …
  }
  
+ const todas = () => new CajaDeHerramientas([calculadora, hora, clima, buscarConocimiento]);
+ 
  await prueba("Calculadora: precedencia, paréntesis y potencias", () => {
    assert.equal(evaluar("2 + 3 * 4"), 14);
  …
  });
  
+ await prueba("extraerJson limpia bloques ```json", () => {
+   assert.deepEqual(extraerJson('Claro:\n```json\n{"a": 1}\n```'), { a: 1 });
+ });
+ 
  await prueba("Strategy: intercambiar proveedor no cambia al agente", async () => {
    const a: LLMProvider = new MockProvider({ etiqueta: "A" });
  …
  });
  
+ await prueba("Nivel 2: usa UNA herramienta", async () => {
+   const r = await new ToolAgent(new MockProvider(), todas()).ejecutar("¿Cuánto es (12 + 8) * 3?");
+   assert.match(r, /60/);
+ });
+ 
+ await prueba("Nivel 2: se queda corto con 2 herramientas (límite esperado)", async () => {
+   const r = await new ToolAgent(new MockProvider(), todas()).ejecutar("¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?");
+   assert.match(r, /Nivel 2 solo usa una herramienta/);
+ });
+ 
  console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
  
````

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

console.log(`\n${process.exitCode ? "⚠️  Hay pruebas fallidas" : `🎉 ${ok} pruebas pasaron. ¡Entorno listo!`}`);
````

</details>

## ▶️ Ejecutar y comprobar

**1.** Mira la traza. La 3.ª pregunta se queda corta a propósito.

```bash
npm run nivel2
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 2 · Agente con herramientas · LLM: mock
════════════════════════════════════════════════════════════

❓ ¿Qué hora es en Colombia?
  [Nivel2 · paso 1] 💭 Necesito usar "hora" para avanzar.
  [Nivel2 · paso 1] 🛠️  hora("")
  [Nivel2 · paso 1] 👁️  jueves, 12 de noviembre de 2026, 9:58 a. m.
➡️  Respuesta: Con lo que obtuve: jueves, 12 de noviembre de 2026, 9:58 a. m.

❓ ¿Cuánto es (12 + 8) * 3?
  [Nivel2 · paso 1] 💭 Necesito usar "calculadora" para avanzar.
  [Nivel2 · paso 1] 🛠️  calculadora("(12 + 8) * 3")
  [Nivel2 · paso 1] 👁️  (12 + 8) * 3 = 60
➡️  Respuesta: Con lo que obtuve: (12 + 8) * 3 = 60

❓ ¿Qué clima hace en Bucaramanga y cuánto es 25 * 4?
  [Nivel2 · paso 1] 💭 Necesito usar "clima" para avanzar.
  [Nivel2 · paso 1] 🛠️  clima("Bucaramanga")
  [Nivel2 · paso 1] 👁️  Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo)
➡️  Respuesta: (Nivel 2 solo usa una herramienta) Esto es lo que obtuve: Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo)

📊 6 llamadas · ~2210 tokens in / ~162 out · 1 ms · 0 errores
```

**2.** Pruebas nuevas del protocolo y del Nivel 2.

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

🎉 11 pruebas pasaron. ¡Entorno listo!
````

## ✅ Checkpoint

Las dos primeras preguntas se resuelven; la tercera muestra «(Nivel 2 solo usa una herramienta)».

Si te quedaste atrás, copia `checkpoints/paso-07/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Quién ejecuta realmente la herramienta: el LLM o tu código? ¿Por qué importa para la seguridad?
- ¿Qué le falta a este agente para poder usar dos herramientas en la misma pregunta?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| El JSON no tiene ni "accion" ni "respuesta_final" | El modelo se salió del formato. Con modelos reales es normal de vez en cuando: el Nivel 3 lo corrige automáticamente. |

## ➡️ Siguiente paso

En el paso 8 le damos al agente un BUCLE para que pueda encadenar herramientas: ReAct.

---
[← Paso 6](06-herramientas.md) · [Paso 8 →](08-nivel3-react.md)
