# Paso 11 · Multi-agente: orquestador y especialistas

> **Nivel 5** · ⏱ ~25 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear un orquestador que reparte subtareas a especialistas (cada uno con SUS herramientas) y lleva un tablero de administración.

## ❓ Qué problema resuelve (por qué hacemos esto)

Un solo agente con muchas herramientas se confunde, es caro y es difícil de probar. Varios agentes pequeños, cada uno con pocas herramientas y un rol claro, son más precisos, más seguros (mínimo privilegio) y se pueden medir y reemplazar por separado.

## 🧠 Conceptos clave

- **Orquestador:** El «jefe»: decide a quién delegar cada subtarea y une los resultados.
- **Mínimo privilegio:** Cada especialista ve SOLO las herramientas que necesita.
- **Administración:** Registrar agentes, medir ejecuciones, éxitos, fallos y tiempos (el tablero).

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
│   │   ├── Orquestador.ts   🆕
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
│   │   ├── nivel4-planificador.ts
│   │   └── nivel5-multiagente.ts   🆕
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

### 1. `src/agentes/Orquestador.ts` — 🆕 nuevo

**Por qué:** Registra especialistas, delega, sintetiza y mide. Es a la vez el «jefe» y el «administrador» del equipo.

**Qué mirar:**

- `Especialista`: nombre, descripción (para que el orquestador decida) y un ReActAgent propio.
- `delegar()` envuelve cada ejecución en try/catch y actualiza `estadisticas` (ejecuciones, éxitos, fallos, tiempo).
- Si el LLM delega a un especialista que no existe, devuelve un error con los válidos, no se cae.
- `tablero()` imprime el estado del equipo: lo que no se mide no se administra.

```ts
import type { LLMProvider } from "../llm/types.js";
import { extraerJson } from "../util/json.js";
import type { Escucha } from "./eventos.js";
import { sintetizar } from "./PlanificadorAgent.js";
import type { ReActAgent } from "./ReActAgent.js";

/** Un especialista: un agente + una descripción para que el orquestador sepa cuándo usarlo. */
export interface Especialista {
  nombre: string;
  descripcion: string;
  agente: ReActAgent;
}

export interface Estadistica {
  ejecuciones: number;
  exitos: number;
  fallos: number;
  msTotal: number;
}

/**
 * NIVEL 5 — Sistema multi-agente con ORQUESTADOR.
 *
 *            ┌────────────── Orquestador ──────────────┐
 *            │  decide a QUIÉN delegar cada subtarea   │
 *            └───────┬──────────────┬──────────────────┘
 *              Investigador     Matemático   … (cada uno con SUS herramientas)
 *
 * Por qué varios agentes pequeños y no uno gigante:
 *   • cada uno tiene pocas herramientas → se confunde menos
 *   • prompts cortos y enfocados → más baratos y más precisos
 *   • puedes probar, medir y reemplazar cada especialista por separado
 *
 * Esta clase también es el ADMINISTRADOR: registra, ejecuta y mide a los agentes.
 */
export class Orquestador {
  private readonly especialistas = new Map<string, Especialista>();
  readonly estadisticas = new Map<string, Estadistica>();

  constructor(
    private readonly llm: LLMProvider,
    especialistas: Especialista[],
    private readonly escucha: Escucha = () => {},
  ) {
    especialistas.forEach((e) => this.registrar(e));
  }

  registrar(e: Especialista) {
    this.especialistas.set(e.nombre, e);
    this.estadisticas.set(e.nombre, { ejecuciones: 0, exitos: 0, fallos: 0, msTotal: 0 });
  }

  quitar(nombre: string) {
    this.especialistas.delete(nombre);
  }

  listar() {
    return [...this.especialistas.values()].map((e) => ({ nombre: e.nombre, descripcion: e.descripcion }));
  }

  private async delegar(d: { agente: string; tarea: string }): Promise<string> {
    const esp = this.especialistas.get(d.agente);
    if (!esp) return `Error: no existe el especialista "${d.agente}". Disponibles: ${[...this.especialistas.keys()].join(", ")}`;

    const est = this.estadisticas.get(d.agente)!;
    const t0 = Date.now();
    est.ejecuciones++;
    try {
      const r = await esp.agente.ejecutar(d.tarea);
      if (r.cortadoPorLimite) est.fallos++;
      else est.exitos++;
      return r.respuesta;
    } catch (e) {
      est.fallos++;
      return `Error del especialista: ${(e as Error).message}`;
    } finally {
      est.msTotal += Date.now() - t0;
    }
  }

  async ejecutar(tarea: string): Promise<{ respuesta: string; delegaciones: { agente: string; tarea: string; respuesta: string }[] }> {
    const catalogo = this.listar().map((e) => `- ${e.nombre}: ${e.descripcion}`).join("\n");
    const crudo = await this.llm.chat(
      [
        {
          rol: "system",
          contenido:
            `Eres un ORQUESTADOR. Reparte la tarea entre estos especialistas:\n${catalogo}\n\n` +
            'Responde SOLO con JSON: {"pensamiento": "...", "delegaciones": [{"agente": "nombre_exacto", "tarea": "subtarea clara y autocontenida"}]}',
        },
        { rol: "user", contenido: tarea },
      ],
      { json: true, temperatura: 0 },
    );

    const lista = extraerJson<{ delegaciones?: { agente: string; tarea: string }[] }>(crudo).delegaciones;
    if (!Array.isArray(lista) || !lista.length) throw new Error("El orquestador no delegó nada");

    const delegaciones: { agente: string; tarea: string; respuesta: string }[] = [];
    for (const [i, d] of lista.entries()) {
      this.escucha({ agente: "Orquestador", tipo: "delegacion", paso: i + 1, texto: `→ ${d.agente}: ${d.tarea}` });
      delegaciones.push({ ...d, respuesta: await this.delegar(d) });
    }

    const respuesta = await sintetizar(
      this.llm,
      tarea,
      delegaciones.map((d) => ({ paso: `${d.agente}: ${d.tarea}`, respuesta: d.respuesta })),
    );
    this.escucha({ agente: "Orquestador", tipo: "final", paso: lista.length + 1, texto: respuesta });
    return { respuesta, delegaciones };
  }

  /** Tablero de administración: ¿quién trabaja bien y quién falla? */
  tablero(): string {
    const filas = [...this.estadisticas.entries()].map(
      ([n, s]) => `  ${n.padEnd(14)} ejecuciones=${s.ejecuciones}  ok=${s.exitos}  fallos=${s.fallos}  tiempo=${s.msTotal}ms`,
    );
    return ["📋 Tablero de agentes:", ...filas].join("\n");
  }
}
```

### 2. `src/niveles/nivel5-multiagente.ts` — 🆕 nuevo

**Por qué:** El ejecutable del Nivel 5: un Investigador (conocimiento, clima, hora) y un Matemático (solo calculadora).

**Qué mirar:**

- Cada especialista recibe su propia `CajaDeHerramientas`: el matemático ni siquiera ve el clima.
- Al final se imprime el tablero de agentes y el resumen del LLM medido.

```ts
/**
 * NIVEL 5 — Multi-agente: un Orquestador reparte el trabajo entre especialistas.
 *
 * Ejecuta:  npm run nivel5
 *           npm run nivel5 -- "¿Qué es RAG y cuánto es 144 / 12?"
 *
 * Fíjate en el tablero final: así se "administra" un equipo de agentes.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos } from "../bootstrap.js";
import { ReActAgent } from "../agentes/ReActAgent.js";
import { Orquestador } from "../agentes/Orquestador.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { CajaDeHerramientas } from "../tools/herramienta.js";
import { calculadora } from "../tools/calculadora.js";
import { buscarConocimiento, clima, hora } from "../tools/basicas.js";
import { titulo, verde, azul } from "../util/consola.js";

async function main() {
  const llm = crearLLM(80);
  titulo(`NIVEL 5 · Multi-agente · LLM: ${llm.nombre}`);

  // Cada especialista ve SOLO sus herramientas → menos confusión, más seguridad.
  const investigador = new ReActAgent({
    llm,
    nombre: "Investigador",
    rol: "Eres el Investigador: respondes preguntas de conocimiento, clima y hora con datos de tus herramientas.",
    herramientas: new CajaDeHerramientas([buscarConocimiento, clima, hora]),
    maxPasos: 4,
    escucha: imprimirEvento,
  });
  const matematico = new ReActAgent({
    llm,
    nombre: "Matematico",
    rol: "Eres el Matemático: resuelves cálculos con la calculadora, nunca de memoria.",
    herramientas: new CajaDeHerramientas([calculadora]),
    maxPasos: 3,
    escucha: imprimirEvento,
  });

  const jefe = new Orquestador(
    llm,
    [
      { nombre: "investigador", descripcion: "Conocimiento de IA, clima de ciudades y hora actual.", agente: investigador },
      { nombre: "matematico", descripcion: "Cualquier cálculo numérico.", agente: matematico },
    ],
    imprimirEvento,
  );

  const tarea = preguntaDeArgumentos() || "¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?";
  console.log(`\n${azul("🎯 Tarea: " + tarea)}\n`);

  const r = await jefe.ejecutar(tarea);
  console.log(`\n${verde("➡️  Respuesta final:")}\n${r.respuesta}`);
  console.log("\n" + jefe.tablero());
  console.log(llm.resumen());
}

main().catch(manejarErrorFatal);
```

### 3. `src/llm/providers/mock.ts` — ✏️ modificado

**Por qué:** El mock completa su repertorio: actúa como «orquestador» (reparte tareas) y como «sintetizador» (une resultados). Este es ya el archivo final.

**Qué mirar:**

- Detecta qué subtareas son matemáticas para delegarlas al especialista correcto.

**Qué cambió respecto al paso anterior:**

```diff
  …
  
      if (system.includes("planificador")) return this.planificar(resto);
+     if (system.includes("orquestador")) return this.orquestar(resto, system);
+     if (system.includes("sintetizador")) return this.sintetizar(resto);
      if (system.includes("resumidor")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(" ").slice(0, 140)}…`;
      if (system.includes('"accion"')) return this.reaccionar(resto, system);
  …
      return JSON.stringify({ pensamiento: "Divido la tarea en pasos pequeños.", pasos: pasos.length ? pasos : [tarea] });
    }
+ 
+   // ---------- Nivel 5: orquestador ----------
+   private orquestar(msgs: Mensaje[], system: string): string {
+     const tarea = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
+     const trozos = tarea
+       .split(/\s+y\s+|,\s*|;\s*/i)
+       .map((p) => p.replace(/^[¿¡\s]+|[?!.\s]+$/g, ""))
+       .filter((p) => p.length > 3);
+     const delegaciones = trozos.map((t) => {
+       const esMate = /\d[\d\s]*[+\-*/^%]\s*\d|calcul|cu[aá]nto es/i.test(t);
+       return { agente: esMate && system.includes("matematico") ? "matematico" : "investigador", tarea: t };
+     });
+     return JSON.stringify({ pensamiento: "Reparto cada parte al especialista adecuado.", delegaciones });
+   }
+ 
+   // ---------- Sintetizador (une resultados en una respuesta final) ----------
+   private sintetizar(msgs: Mensaje[]): string {
+     const datos = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
+     return `Resumen final (mock):\n${datos}`;
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
    if (system.includes("orquestador")) return this.orquestar(resto, system);
    if (system.includes("sintetizador")) return this.sintetizar(resto);
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

  // ---------- Nivel 5: orquestador ----------
  private orquestar(msgs: Mensaje[], system: string): string {
    const tarea = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
    const trozos = tarea
      .split(/\s+y\s+|,\s*|;\s*/i)
      .map((p) => p.replace(/^[¿¡\s]+|[?!.\s]+$/g, ""))
      .filter((p) => p.length > 3);
    const delegaciones = trozos.map((t) => {
      const esMate = /\d[\d\s]*[+\-*/^%]\s*\d|calcul|cu[aá]nto es/i.test(t);
      return { agente: esMate && system.includes("matematico") ? "matematico" : "investigador", tarea: t };
    });
    return JSON.stringify({ pensamiento: "Reparto cada parte al especialista adecuado.", delegaciones });
  }

  // ---------- Sintetizador (une resultados en una respuesta final) ----------
  private sintetizar(msgs: Mensaje[]): string {
    const datos = msgs.filter((m) => m.rol === "user").at(-1)?.contenido ?? "";
    return `Resumen final (mock):\n${datos}`;
  }
}
```

</details>

### 4. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run nivel5`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "skills": "tsx src/niveles/nivel3b-skills.ts",
      "nivel4": "tsx src/niveles/nivel4-planificador.ts",
+     "nivel5": "tsx src/niveles/nivel5-multiagente.ts",
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
    "nivel5": "tsx src/niveles/nivel5-multiagente.ts",
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

**Por qué:** Se agregan las pruebas de este paso (1): «Nivel 5 (Orquestador): delega a especialistas y lleva estadísticas».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import { ReActAgent } from "./agentes/ReActAgent.js";
  import { PlanificadorAgent } from "./agentes/PlanificadorAgent.js";
+ import { Orquestador } from "./agentes/Orquestador.js";
  import { BibliotecaSkills, parsearSkill } from "./skills/biblioteca.js";
  import type { LLMProvider } from "./llm/types.js";
  …
  });
  
+ await prueba("Nivel 5 (Orquestador): delega a especialistas y lleva estadísticas", async () => {
+   const llm = new MockProvider();
+   const investigador = new ReActAgent({ llm, nombre: "Investigador", rol: "Investigador.", herramientas: new CajaDeHerramientas([buscarConocimiento, clima, hora]) });
+   const matematico = new ReActAgent({ llm, nombre: "Matematico", rol: "Matemático.", herramientas: new CajaDeHerramientas([calculadora]) });
+   const jefe = new Orquestador(llm, [
+     { nombre: "investigador", descripcion: "conocimiento y clima", agente: investigador },
+     { nombre: "matematico", descripcion: "cálculos", agente: matematico },
+   ]);
+   const r = await jefe.ejecutar("¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?");
+   assert.equal(r.delegaciones.length, 3);
+   assert.equal(r.delegaciones.filter((d) => d.agente === "matematico").length, 1);
+   assert.match(r.respuesta, /= 12/);
+   assert.equal(jefe.estadisticas.get("matematico")!.exitos, 1);
+   assert.equal(jefe.estadisticas.get("investigador")!.exitos, 2);
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
import { Orquestador } from "./agentes/Orquestador.js";
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

await prueba("Nivel 4 (Planificador): crea plan, ejecuta pasos y sintetiza", async () => {
  const llm = new MockProvider();
  const ejecutor = new ReActAgent({ llm, herramientas: todas(), rol: "Ejecutor." });
  const r = await new PlanificadorAgent(llm, ejecutor).ejecutar("Dime qué es un agente, el clima en Piedecuesta y cuánto es 18 * 7");
  assert.equal(r.plan.length, 3);
  assert.match(r.respuesta, /126/);
  assert.match(r.respuesta, /25 °C/);
});

await prueba("Nivel 5 (Orquestador): delega a especialistas y lleva estadísticas", async () => {
  const llm = new MockProvider();
  const investigador = new ReActAgent({ llm, nombre: "Investigador", rol: "Investigador.", herramientas: new CajaDeHerramientas([buscarConocimiento, clima, hora]) });
  const matematico = new ReActAgent({ llm, nombre: "Matematico", rol: "Matemático.", herramientas: new CajaDeHerramientas([calculadora]) });
  const jefe = new Orquestador(llm, [
    { nombre: "investigador", descripcion: "conocimiento y clima", agente: investigador },
    { nombre: "matematico", descripcion: "cálculos", agente: matematico },
  ]);
  const r = await jefe.ejecutar("¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?");
  assert.equal(r.delegaciones.length, 3);
  assert.equal(r.delegaciones.filter((d) => d.agente === "matematico").length, 1);
  assert.match(r.respuesta, /= 12/);
  assert.equal(jefe.estadisticas.get("matematico")!.exitos, 1);
  assert.equal(jefe.estadisticas.get("investigador")!.exitos, 2);
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

**1.** Mira las delegaciones y el tablero final.

```bash
npm run nivel5
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 5 · Multi-agente · LLM: mock
════════════════════════════════════════════════════════════

🎯 Tarea: ¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?

  [Orquestador · paso 1] 📨 → investigador: Qué es RAG
  [Investigador · paso 1] 💭 Necesito usar "buscar_conocimiento" para avanzar.
  [Investigador · paso 1] 🛠️  buscar_conocimiento("RAG")
  [Investigador · paso 1] 👁️  RAG (Retrieval-Augmented Generation) busca fragmentos relevantes en tus documentos y se los entrega al LLM para que responda con datos reales.
  [Investigador · paso 2] 💭 Ya tengo lo necesario para responder.
  [Investigador · paso 2] ✅ Con lo que obtuve: RAG (Retrieval-Augmented Generation) busca fragmentos relevantes en tus documentos y se los entrega al LLM para que responda con datos reales.
  [Orquestador · paso 2] 📨 → investigador: qué clima hace en Cali
  [Investigador · paso 1] 💭 Necesito usar "clima" para avanzar.
  [Investigador · paso 1] 🛠️  clima("Cali")
  [Investigador · paso 1] 👁️  Clima en Cali: 27 °C, soleado (datos de ejemplo)
  [Investigador · paso 2] 💭 Ya tengo lo necesario para responder.
  [Investigador · paso 2] ✅ Con lo que obtuve: Clima en Cali: 27 °C, soleado (datos de ejemplo)
  [Orquestador · paso 3] 📨 → matematico: cuánto es 144 / 12
  [Matematico · paso 1] 💭 Necesito usar "calculadora" para avanzar.
  [Matematico · paso 1] 🛠️  calculadora("144 / 12")
  [Matematico · paso 1] 👁️  144 / 12 = 12
  [Matematico · paso 2] 💭 Ya tengo lo necesario para responder.
  [Matematico · paso 2] ✅ Con lo que obtuve: 144 / 12 = 12
  [Orquestador · paso 4] ✅ Resumen final (mock):
Tarea original: ¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?

Resultados:
1. investigador: Qué es RAG → Con lo que obtuve: RAG (Retrieval-Augmented Generation) busca fragmentos relevantes en tus documentos y se los entrega al LLM para que responda con datos reales.
2. investigador: qué clima hace en Cali → Con lo que obtuve: Clima en Cali: 27 °C, soleado (datos de ejemplo)
3. matematico: cuánto es 144 / 12 → Con lo que obtuve: 144 / 12 = 12

➡️  Respuesta final:
Resumen final (mock):
Tarea original: ¿Qué es RAG?, ¿qué clima hace en Cali? y ¿cuánto es 144 / 12?

Resultados:
1. investigador: Qué es RAG → Con lo que obtuve: RAG (Retrieval-Augmented Generation) busca fragmentos relevantes en tus documentos y se los entrega al LLM para que responda con datos reales.
2. investigador: qué clima hace en Cali → Con lo que obtuve: Clima en Cali: 27 °C, soleado (datos de ejemplo)
3. matematico: cuánto es 144 / 12 → Con lo que obtuve: 144 / 12 = 12

📋 Tablero de agentes:
  investigador   ejecuciones=2  ok=2  fallos=0  tiempo=1ms
  matematico     ejecuciones=1  ok=1  fallos=0  tiempo=1ms
📊 8 llamadas · ~2095 tokens in / ~383 out · 0 ms · 0 errores
```

## ✅ Checkpoint

El tablero muestra qué especialista trabajó, cuántas veces y con qué resultado.

Si te quedaste atrás, copia `checkpoints/paso-11/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Por qué conviene que cada especialista tenga POCAS herramientas?
- ¿Qué métricas agregarías al tablero para un sistema en producción?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| El orquestador no delegó nada | El modelo no devolvió la lista de delegaciones. Revisa la descripción de cada especialista. |

## ➡️ Siguiente paso

En el paso 12 extendemos el sistema con retos, sin tocar los agentes.

---
[← Paso 10](10-nivel4-planificador.md) · [Paso 12 →](12-retos-extender.md)
