# Paso 9 · Skills: conocimiento experto bajo demanda

> **Nivel 3b** · ⏱ ~20 min · [← Índice](../README.md)

## 🎯 Qué construimos

Crear un cargador de skills (SKILL.md) y hacer que el agente las cargue por demanda con la herramienta cargar_skill.

## ❓ Qué problema resuelve (por qué hacemos esto)

Una herramienta le dice al agente QUÉ puede hacer. Pero ¿cómo le enseñas A HACERLO BIEN (formatos, reglas de tu empresa, pasos)? Meter todas las instrucciones en el prompt lo llena y lo encarece. Una skill es un paquete de instrucciones en Markdown que se carga SOLO cuando hace falta (divulgación progresiva).

## 🧠 Conceptos clave

- **Tool vs Skill:** Tool = función que el agente ejecuta (hacer). Skill = instrucciones que el agente lee (saber cómo).
- **SKILL.md:** Una carpeta con un SKILL.md: encabezado con name y description, y el cuerpo con las instrucciones.
- **Divulgación progresiva:** Siempre se ve el catálogo (nombre + descripción); el cuerpo completo se carga solo si la tarea lo requiere.
- **Skill entregada por una tool:** En este proyecto la skill llega al agente mediante la herramienta cargar_skill.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── skills/
│   ├── reporte-clima/
│   │   └── SKILL.md   🆕
│   └── resumen-ejecutivo/
│       └── SKILL.md   🆕
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts
│   │   ├── eventos.ts
│   │   ├── memoria.ts
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
│   │   └── nivel3b-skills.ts   🆕
│   ├── skills/
│   │   └── biblioteca.ts   🆕
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

### 1. `src/skills/biblioteca.ts` — 🆕 nuevo

**Por qué:** Lee la carpeta skills/, parsea cada SKILL.md y ofrece el catálogo, la carga bajo demanda y la herramienta cargar_skill.

**Qué mirar:**

- `parsearSkill`: separa el encabezado (--- … ---) del cuerpo y exige `description`.
- `catalogo()` → solo nombre + descripción (barato, siempre al prompt). `cargar(nombre)` → el cuerpo completo (bajo demanda).
- `comoHerramienta()` devuelve una Herramienta normal: una skill no necesita un mecanismo nuevo en el agente.

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Herramienta } from "../tools/herramienta.js";

/**
 * SKILLS ≠ TOOLS
 *   • Tool  = una FUNCIÓN que el agente puede ejecutar (acción: calcular, consultar el clima…).
 *   • Skill = un PAQUETE DE INSTRUCCIONES (un SKILL.md) que le enseña CÓMO hacer una tarea.
 *
 * Una skill es una carpeta:   skills/<nombre>/SKILL.md
 *   ---
 *   name: reporte-clima
 *   description: qué hace y cuándo usarla      ← esto es lo ÚNICO que el agente ve siempre
 *   ---
 *   (instrucciones completas…)                 ← esto se carga SOLO cuando hace falta
 *
 * Esa carga "por demanda" se llama DIVULGACIÓN PROGRESIVA: 50 skills instaladas no llenan
 * el contexto, porque el agente solo lleva el catálogo (nombre + descripción) y pide el resto.
 * Aquí lo implementamos "desde cero": la carga se entrega al agente mediante una herramienta.
 */
export interface Skill {
  nombre: string;
  descripcion: string;
  instrucciones: string;
}

/** Separa el encabezado YAML simple (clave: valor) del cuerpo en Markdown. */
export function parsearSkill(texto: string, nombreCarpeta: string): Skill {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(texto.trim());
  if (!m) throw new Error(`La skill "${nombreCarpeta}" no tiene encabezado --- ... ---`);

  const meta: Record<string, string> = {};
  for (const linea of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(linea);
    if (kv) meta[kv[1]!.toLowerCase()] = kv[2]!.trim();
  }
  const nombre = meta.name ?? nombreCarpeta;
  if (!meta.description) throw new Error(`La skill "${nombre}" necesita "description" (el agente decide con ella cuándo usarla)`);
  return { nombre, descripcion: meta.description, instrucciones: m[2]!.trim() };
}

export class BibliotecaSkills {
  private readonly skills = new Map<string, Skill>();

  constructor(carpeta: string = fileURLToPath(new URL("../../skills/", import.meta.url))) {
    if (!existsSync(carpeta)) return;
    for (const dir of readdirSync(carpeta)) {
      const archivo = join(carpeta, dir, "SKILL.md");
      if (statSync(join(carpeta, dir)).isDirectory() && existsSync(archivo)) {
        const s = parsearSkill(readFileSync(archivo, "utf8"), dir);
        this.skills.set(s.nombre, s);
      }
    }
  }

  nombres() {
    return [...this.skills.keys()];
  }

  /** Nivel 1 de la divulgación progresiva: SOLO nombre y descripción (barato). */
  catalogo(): string {
    return [...this.skills.values()].map((s) => `- ${s.nombre}: ${s.descripcion}`).join("\n") || "(sin skills)";
  }

  /** Nivel 2: las instrucciones completas, bajo demanda. */
  cargar(nombre: string): string {
    const s = this.skills.get(nombre.trim());
    if (!s) throw new Error(`No existe la skill "${nombre}". Skills válidas: ${this.nombres().join(", ") || "(ninguna)"}`);
    return `Instrucciones de la skill "${s.nombre}":\n${s.instrucciones}`;
  }

  /** La skill llega al agente a través de una HERRAMIENTA de carga. */
  comoHerramienta(): Herramienta {
    return {
      nombre: "cargar_skill",
      descripcion:
        "Carga las instrucciones completas de una skill. Úsala ANTES de actuar cuando una skill del catálogo aplique a la tarea. " +
        `Skills disponibles: ${this.nombres().join(", ")}. La entrada es SOLO el nombre exacto de la skill.`,
      ejemploEntrada: this.nombres()[0] ?? "nombre-de-la-skill",
      ejecutar: (entrada) => this.cargar(entrada),
    };
  }
}
```

### 2. `skills/reporte-clima/SKILL.md` — 🆕 nuevo

**Por qué:** Una skill de ejemplo: enseña el formato y las reglas de un reporte del clima (usa la herramienta `clima`).

**Qué mirar:**

- La `description` decide CUÁNDO se usa: dice qué hace y cuándo aplicarla.
- El cuerpo son instrucciones paso a paso en lenguaje natural.

```markdown
---
name: reporte-clima
description: Cómo presentar un reporte del clima de una ciudad (formato y recomendación). Úsala cuando pidan un reporte o informe del clima.
---

# Reporte del clima

Sigue estos pasos EN ORDEN:

1. Usa la herramienta `clima` con el nombre de la ciudad. No inventes temperaturas.
2. Presenta la respuesta con exactamente este formato:
   - 📍 Ciudad: <nombre>
   - 🌡️ Temperatura: <valor y estado del cielo>
   - 💡 Recomendación: <una frase>
3. Reglas para la recomendación:
   - Si el estado menciona lluvia o llovizna: "Lleva paraguas".
   - Si la temperatura supera los 28 °C: "Usa ropa ligera e hidrátate".
   - En otro caso: "Buen día para salir".
4. Termina indicando que los datos son de ejemplo si la herramienta lo dice.
```

### 3. `skills/resumen-ejecutivo/SKILL.md` — 🆕 nuevo

**Por qué:** Una segunda skill, esta de redacción: no usa herramientas, solo reglas de estilo.

**Qué mirar:**

- Las skills pueden enseñar formato y criterio, no solo procedimientos con herramientas.

```markdown
---
name: resumen-ejecutivo
description: Cómo escribir un resumen ejecutivo claro y corto para jefes o clientes. Úsala cuando pidan un resumen o informe de varios datos.
---

# Resumen ejecutivo

1. Empieza por la CONCLUSIÓN en una sola frase (qué se decidió o qué se encontró).
2. Luego, máximo 3 viñetas con los datos que la respaldan.
3. Cierra con la acción recomendada o el siguiente paso.
4. Límite total: 60 palabras. Sin adornos ni jerga técnica.
5. Si falta un dato clave, dilo explícitamente en lugar de suponerlo.
```

### 4. `src/niveles/nivel3b-skills.ts` — 🆕 nuevo

**Por qué:** Un agente ReAct al que se le suma la herramienta cargar_skill y el catálogo en su rol.

**Qué mirar:**

- El agente ve el catálogo en el prompt, pero NO el cuerpo de cada skill.
- En la traza: primero `cargar_skill(...)`, luego las herramientas normales siguiendo las instrucciones.
- Crea tu propia carpeta skills/mi-skill/SKILL.md y vuelve a ejecutar.

```ts
/**
 * NIVEL 3b — Agente ReAct + SKILLS (herramientas + conocimiento experto bajo demanda).
 *
 * Ejecuta:  npm run skills
 *           npm run skills -- "Haz un reporte del clima en Cali"
 *
 * Observa en la traza:
 *   1) El agente ve solo el CATÁLOGO (nombre + descripción) de cada skill.
 *   2) Decide cargar la skill que aplica  → cargar_skill("reporte-clima")
 *   3) Sigue sus instrucciones y usa las herramientas normales (clima…).
 *
 * Experimento: crea tu propia carpeta skills/<nombre>/SKILL.md y vuelve a ejecutar.
 */
import "../config.js";
import { crearLLM, manejarErrorFatal, preguntaDeArgumentos, todasLasHerramientas } from "../bootstrap.js";
import { ReActAgent } from "../agentes/ReActAgent.js";
import { imprimirEvento } from "../agentes/eventos.js";
import { BibliotecaSkills } from "../skills/biblioteca.js";
import { titulo, verde, azul, gris } from "../util/consola.js";

async function main() {
  const llm = crearLLM();
  const skills = new BibliotecaSkills();
  titulo(`NIVEL 3b · ReAct + Skills · LLM: ${llm.nombre}`);

  console.log(gris("Catálogo que ve el agente (solo nombre + descripción):"));
  console.log(gris(skills.catalogo()) + "\n");

  const herramientas = todasLasHerramientas().agregar(skills.comoHerramienta());
  const agente = new ReActAgent({
    llm,
    herramientas,
    nombre: "ReAct+Skills",
    maxPasos: 6,
    escucha: imprimirEvento,
    rol:
      "Eres un asistente del SENA. Dispones de SKILLS: instrucciones expertas que cargas con la herramienta cargar_skill.\n" +
      `CATÁLOGO DE SKILLS:\n${skills.catalogo()}\n` +
      "Si una skill aplica a la tarea, cárgala primero y sigue sus instrucciones al pie de la letra.",
  });

  const pregunta = preguntaDeArgumentos() || "Haz un reporte del clima en Bucaramanga";
  console.log(azul("❓ " + pregunta));
  const r = await agente.ejecutar(pregunta);
  console.log(`${verde("➡️  Respuesta final:")} ${r.respuesta}`);
  console.log(`   pasos usados: ${r.pasos}`);
  console.log("\n" + llm.resumen());
}

main().catch(manejarErrorFatal);
```

### 5. `src/llm/providers/mock.ts` — ✏️ modificado

**Por qué:** El mock aprende a cargar una skill cuando piden un «reporte» o «informe» antes de usar herramientas, y a mencionar la skill en su respuesta.

**Qué mirar:**

- Las instrucciones de la skill no se tratan como «datos» de la respuesta, sino como guía.

**Qué cambió respecto al paso anterior:**

```diff
  …
        });
      }
+     // Las observaciones que son instrucciones de una skill no son "datos": se usan como guía.
+     const PREFIJO_SKILL = "Instrucciones de la skill";
+     const skill = /^Instrucciones de la skill "([^"]+)"/.exec(observaciones.find((o) => o.startsWith(PREFIJO_SKILL)) ?? "")?.[1];
+     const datos = observaciones.filter((o) => !o.startsWith(PREFIJO_SKILL));
      const respuesta = observaciones.length
-       ? `Con lo que obtuve: ${observaciones.join(" | ")}`
+       ? `${skill ? `Siguiendo la skill "${skill}": ` : "Con lo que obtuve: "}${datos.join(" | ")}`
        : `No necesito herramientas para esto. (mock) Pregunta: ${pregunta.slice(0, 80)}`;
      return JSON.stringify({ pensamiento: "Ya tengo lo necesario para responder.", respuesta_final: respuesta });
  …
      const mat = [...texto.matchAll(/\(*\d[\d\s+\-*/^%().]*[\d)]/g)].find((m) => /[+\-*/^%]/.test(m[0]));
      if (mat) hallazgos.push({ pos: mat.index ?? 0, nombre: "calculadora", entrada: mat[0].trim() });
+     // Si piden un "reporte/informe", el mock carga la skill adecuada ANTES de actuar.
+     const rep = /\b(reporte|informe)\b/i.exec(texto);
+     if (rep) {
+       hallazgos.push({ pos: rep.index, nombre: "cargar_skill", entrada: /clima|temperatura/i.test(texto) ? "reporte-clima" : "resumen-ejecutivo" });
+     }
      const hora = /\bhora\b/i.exec(texto);
      if (hora) hallazgos.push({ pos: hora.index, nombre: "hora", entrada: "" });
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
}
```

</details>

### 6. `package.json` — ✏️ modificado

**Por qué:** Se agregan los scripts de este paso: `npm run skills`. Los scripts son atajos para no recordar rutas largas.

**Qué cambió respecto al paso anterior:**

```diff
  …
      "nivel2": "tsx src/niveles/nivel2-herramientas.ts",
      "nivel3": "tsx src/niveles/nivel3-react.ts",
+     "skills": "tsx src/niveles/nivel3b-skills.ts",
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

**Por qué:** Se agregan las pruebas de este paso (3): «Skills: el catálogo solo trae nombre y descripción (divulgación progresiva)»; «Skills: parsearSkill exige 'description' y cargar() da error útil»; «Agente + skill: carga la skill, luego usa la herramienta y responde».

**Qué mirar:**

- Probar cada capa justo después de construirla evita buscar errores dentro de un agente.

**Qué cambió respecto al paso anterior:**

```diff
  …
  import { ToolAgent } from "./agentes/ToolAgent.js";
  import { ReActAgent } from "./agentes/ReActAgent.js";
+ import { BibliotecaSkills, parsearSkill } from "./skills/biblioteca.js";
  import type { LLMProvider } from "./llm/types.js";
  
  …
  });
  
+ await prueba("Skills: el catálogo solo trae nombre y descripción (divulgación progresiva)", () => {
+   const b = new BibliotecaSkills();
+   assert.ok(b.nombres().includes("reporte-clima") && b.nombres().includes("resumen-ejecutivo"));
+   assert.match(b.catalogo(), /reporte-clima: Cómo presentar/);
+   assert.doesNotMatch(b.catalogo(), /paraguas/); // el contenido completo NO está en el catálogo…
+   assert.match(b.cargar("reporte-clima"), /paraguas/); // …se obtiene al cargarla
+ });
+ 
+ await prueba("Skills: parsearSkill exige 'description' y cargar() da error útil", () => {
+   assert.throws(() => parsearSkill("---\nname: x\n---\ncuerpo", "x"), /description/);
+   assert.throws(() => parsearSkill("sin encabezado", "x"), /encabezado/);
+   assert.throws(() => new BibliotecaSkills().cargar("no-existe"), /Skills válidas: .*reporte-clima/);
+ });
+ 
+ await prueba("Agente + skill: carga la skill, luego usa la herramienta y responde", async () => {
+   const b = new BibliotecaSkills();
+   const agente = new ReActAgent({ llm: new MockProvider(), herramientas: todas().agregar(b.comoHerramienta()), rol: `Asistente.\n${b.catalogo()}` });
+   const r = await agente.ejecutar("Haz un reporte del clima en Bucaramanga");
+   assert.equal(r.cortadoPorLimite, false);
+   assert.equal(r.pasos, 3); // cargar_skill → clima → respuesta
+   assert.match(r.respuesta, /Siguiendo la skill "reporte-clima"/);
+   assert.match(r.respuesta, /24 °C/);
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

**1.** Mira el catálogo y luego la traza: cargar_skill → clima → respuesta.

```bash
npm run skills
```

**Debes ver (los valores pueden variar):**

```
════════════════════════════════════════════════════════════
NIVEL 3b · ReAct + Skills · LLM: mock
════════════════════════════════════════════════════════════
Catálogo que ve el agente (solo nombre + descripción):
- reporte-clima: Cómo presentar un reporte del clima de una ciudad (formato y recomendación). Úsala cuando pidan un reporte o informe del clima.
- resumen-ejecutivo: Cómo escribir un resumen ejecutivo claro y corto para jefes o clientes. Úsala cuando pidan un resumen o informe de varios datos.

❓ Haz un reporte del clima en Bucaramanga
  [ReAct+Skills · paso 1] 💭 Necesito usar "cargar_skill" para avanzar.
  [ReAct+Skills · paso 1] 🛠️  cargar_skill("reporte-clima")
  [ReAct+Skills · paso 1] 👁️  Instrucciones de la skill "reporte-clima":
# Reporte del clima

Sigue estos pasos EN ORDEN:

1. Usa la herramienta `clima` con el nombre de la ciudad. No inventes temperaturas.
2. Presenta la respuesta con exactamente este formato:
   - 📍 Ciudad: <nombre>
   - 🌡️ Temperatura: <valor y estado del cielo>
   - 💡 Recomendación: <una frase>
3. Reglas para la recomendación:
   - Si el estado menciona lluvia o llovizna: "Lleva paraguas".
   - Si la temperatura supera los 28 °C: "Usa ropa ligera e hidrátate".
   - En otro caso: "Buen día para salir".
4. Termina indicando que los datos son de ejemplo si la herramienta lo dice.
  [ReAct+Skills · paso 2] 💭 Necesito usar "clima" para avanzar.
  [ReAct+Skills · paso 2] 🛠️  clima("Bucaramanga")
  [ReAct+Skills · paso 2] 👁️  Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo)
  [ReAct+Skills · paso 3] 💭 Ya tengo lo necesario para responder.
  [ReAct+Skills · paso 3] ✅ Siguiendo la skill "reporte-clima": Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo)
➡️  Respuesta final: Siguiendo la skill "reporte-clima": Clima en Bucaramanga: 24 °C, parcialmente soleado (datos de ejemplo)
   pasos usados: 3

📊 3 llamadas · ~2007 tokens in / ~98 out · 1 ms · 0 errores
```

**2.** Tres pruebas nuevas: catálogo, parser y agente con skill.

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
✅ Nivel 2: usa UNA herramienta
✅ Nivel 2: se queda corto con 2 herramientas (límite esperado)
✅ Nivel 3 (ReAct): encadena clima + calculadora
✅ Nivel 3 (ReAct): freno de emergencia con maxPasos
✅ Nivel 3 (ReAct): un error de herramienta no tumba al agente
✅ Skills: el catálogo solo trae nombre y descripción (divulgación progresiva)
✅ Skills: parsearSkill exige 'description' y cargar() da error útil
✅ Agente + skill: carga la skill, luego usa la herramienta y responde

🎉 16 pruebas pasaron. ¡Entorno listo!
````

## ✅ Checkpoint

La traza muestra `cargar_skill("reporte-clima")` antes de usar `clima`.

Si te quedaste atrás, copia `checkpoints/paso-09/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Qué diferencia hay entre una tool y una skill? Da un ejemplo de cada una.
- ¿Por qué no pegar todas las skills en el prompt desde el inicio?
- Una skill es texto que el agente obedece: ¿qué riesgo tiene instalar skills de terceros sin leerlas?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| La skill "x" necesita "description" | Falta la línea `description:` en el encabezado del SKILL.md. |
| No existe la skill "x" | El nombre no coincide con el `name` del encabezado. El error lista las válidas. |

## ➡️ Siguiente paso

En el paso 10 el agente aprende a planificar antes de actuar.

---
[← Paso 8](08-nivel3-react.md) · [Paso 10 →](10-nivel4-planificador.md)
