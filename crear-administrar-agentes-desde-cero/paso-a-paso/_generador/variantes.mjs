/**
 * VARIANTES: cómo se ve cada archivo del proyecto en cada paso del tutorial.
 *
 * Idea clave: el proyecto final (carpeta ../../codigo) es la ÚNICA fuente de verdad.
 * Los estados intermedios se derivan de él (quitando lo que aún no existe) o, en los pocos
 * archivos muy pequeños, se escriben a mano aquí. El generador comprueba que el último paso
 * reproduzca el proyecto final byte a byte, y que cada paso compile y se ejecute.
 */
import fs from "node:fs";
import path from "node:path";

export const ULTIMO_PASO = 12;

/** Archivos del proyecto: en qué paso aparecen (desde) y, si aplica, hasta cuál existen (hasta). */
export const MANIFIESTO = [
  { ruta: "package.json", desde: 0, variante: "package" },
  { ruta: "tsconfig.json", desde: 0 },
  { ruta: ".gitignore", desde: 0 },
  { ruta: "src/hola.ts", desde: 0, hasta: 0, inline: true },
  { ruta: "src/probar.ts", desde: 1, hasta: 1, inline: true },
  { ruta: "src/llm/types.ts", desde: 1 },
  { ruta: "src/llm/providers/mock.ts", desde: 1, variante: "mock" },
  { ruta: "src/config.ts", desde: 2 },
  { ruta: "src/util/consola.ts", desde: 2, variante: "consola" },
  { ruta: "src/llm/factory.ts", desde: 2, variante: "factory" },
  { ruta: "src/llm/medido.ts", desde: 2 },
  { ruta: "src/bootstrap.ts", desde: 2, variante: "bootstrap" },
  { ruta: "src/niveles/nivel0-llamada.ts", desde: 2 },
  { ruta: ".env.example", desde: 2, variante: "env" },
  { ruta: "src/verificar.ts", desde: 2, variante: "verificar" },
  { ruta: "src/util/http.ts", desde: 3 },
  { ruta: "src/llm/providers/gemini.ts", desde: 3 },
  { ruta: "src/llm/providers/cohere.ts", desde: 3 },
  { ruta: "src/llm/providers/groq.ts", desde: 3 },
  { ruta: "src/llm/providers/fallback.ts", desde: 4 },
  { ruta: "src/niveles/comparar-proveedores.ts", desde: 4 },
  { ruta: "src/agentes/memoria.ts", desde: 5 },
  { ruta: "src/agentes/ChatAgent.ts", desde: 5 },
  { ruta: "src/niveles/nivel1-chatbot.ts", desde: 5 },
  { ruta: "src/tools/herramienta.ts", desde: 6 },
  { ruta: "src/tools/calculadora.ts", desde: 6 },
  { ruta: "src/tools/basicas.ts", desde: 6 },
  { ruta: "src/util/json.ts", desde: 7 },
  { ruta: "src/agentes/protocolo.ts", desde: 7 },
  { ruta: "src/agentes/eventos.ts", desde: 7 },
  { ruta: "src/agentes/ToolAgent.ts", desde: 7 },
  { ruta: "src/niveles/nivel2-herramientas.ts", desde: 7 },
  { ruta: "src/agentes/ReActAgent.ts", desde: 8 },
  { ruta: "src/niveles/nivel3-react.ts", desde: 8 },
  { ruta: "src/skills/biblioteca.ts", desde: 9 },
  { ruta: "skills/reporte-clima/SKILL.md", desde: 9 },
  { ruta: "skills/resumen-ejecutivo/SKILL.md", desde: 9 },
  { ruta: "src/niveles/nivel3b-skills.ts", desde: 9 },
  { ruta: "src/agentes/PlanificadorAgent.ts", desde: 10 },
  { ruta: "src/niveles/nivel4-planificador.ts", desde: 10 },
  { ruta: "src/agentes/Orquestador.ts", desde: 11 },
  { ruta: "src/niveles/nivel5-multiagente.ts", desde: 11 },
  { ruta: "src/soluciones/climaReal.ts", desde: 12 },
  { ruta: "src/soluciones/convertirMoneda.ts", desde: 12 },
  { ruta: "src/soluciones/ollama.ts", desde: 12 },
  { ruta: "src/soluciones/probar-soluciones.ts", desde: 12 },
];

/** Contenido de los archivos que solo existen en un paso (scripts de prueba temporales). */
const INLINE = {
  "src/hola.ts": `const nombre: string = "SENA";
console.log(\`Hola desde TypeScript, \${nombre}! Node \${process.version}\`);
`,
  "src/probar.ts": `import { MockProvider } from "./llm/providers/mock.js";

// Script de prueba TEMPORAL: lo borraremos en el paso 2.
const llm = new MockProvider();

const respuesta = await llm.chat([{ rol: "user", contenido: "Hola, me llamo Camila" }]);
console.log(respuesta);
`,
};

/** Paso en el que aparece cada script de package.json. */
const SCRIPT_DESDE = {
  typecheck: 0, nivel0: 2, test: 2, comparar: 4, nivel1: 5, nivel2: 7, nivel3: 8, skills: 9, nivel4: 10, nivel5: 11, soluciones: 12,
};

/** Paso en el que aparece cada prueba de verificar.ts (según el nombre de la prueba). */
const PRUEBA_DESDE = [
  [/^LLMMedido/, 2],
  [/^Fallback/, 4],
  [/^Strategy: intercambiar/, 5],
  [/^Memoria:/, 5],
  [/^Calculadora/, 6],
  [/^extraerJson/, 7],
  [/^Nivel 2/, 7],
  [/^Nivel 3/, 8],
  [/^Skills|^Agente \+ skill/, 9],
  [/^Nivel 4/, 10],
  [/^Nivel 5/, 11],
];

/** Nivel de detalle del MockProvider por paso. */
function nivelMock(paso) {
  if (paso >= 11) return 7;
  if (paso >= 10) return 6;
  if (paso >= 9) return 5;
  if (paso >= 7) return 4;
  if (paso >= 5) return 3;
  if (paso >= 4) return 2;
  return 1;
}

// ---------------------------------------------------------------- utilidades de texto
function quitarMetodo(src, nombre) {
  const ini = src.indexOf(`  private ${nombre}(`);
  if (ini < 0) throw new Error(`Método no hallado en mock.ts: ${nombre}`);
  let desde = ini;
  const inicioLineaPrev = src.lastIndexOf("\n", ini - 2) + 1;
  if (/^\s*\/\/ -{5,}/.test(src.slice(inicioLineaPrev, ini))) desde = inicioLineaPrev;
  const fin = src.indexOf("\n  }\n", ini) + 5;
  const d = src[desde - 1] === "\n" && src[desde - 2] === "\n" ? desde - 1 : desde;
  return src.slice(0, d) + src.slice(fin);
}

function reemplazarObligatorio(src, patron, nuevo, etiqueta) {
  const out = src.replace(patron, nuevo);
  if (out === src) throw new Error(`No se pudo aplicar la variante: ${etiqueta}`);
  return out;
}

// ---------------------------------------------------------------- variante: MockProvider
function mockVariante(final, nivel) {
  let s = final;

  // 1) El método chat() se reconstruye según el nivel
  const lineas = [];
  if (nivel >= 2) {
    lineas.push(`    if (this.op.fallar) throw new ErrorLLM(this.nombre, "Fallo simulado (503 servicio no disponible)", 503);`);
    lineas.push(`    if (this.op.latenciaMs) await dormir(this.op.latenciaMs);`);
    lineas.push("");
  }
  if (nivel >= 3) {
    lineas.push(`    const system = mensajes.filter((m) => m.rol === "system").map((m) => m.contenido).join(" ").toLowerCase();`);
    lineas.push(`    const resto = mensajes.filter((m) => m.rol !== "system");`);
    lineas.push("");
    if (nivel >= 6) lineas.push(`    if (system.includes("planificador")) return this.planificar(resto);`);
    if (nivel >= 7) lineas.push(`    if (system.includes("orquestador")) return this.orquestar(resto, system);`);
    if (nivel >= 7) lineas.push(`    if (system.includes("sintetizador")) return this.sintetizar(resto);`);
    lineas.push("    if (system.includes(\"resumidor\")) return `Resumen (mock): ${resto.map((m) => m.contenido).join(\" \").slice(0, 140)}…`;");
    if (nivel >= 4) lineas.push(`    if (system.includes('"accion"')) return this.reaccionar(resto, system);`);
    lineas.push(`    return this.conversar(resto);`);
  } else {
    lineas.push(`    return this.conversar(mensajes);`);
  }
  const chatNuevo = `  async chat(mensajes: Mensaje[]): Promise<string> {\n${lineas.join("\n")}\n  }\n`;
  const iniChat = s.indexOf("  async chat(");
  const finChat = s.indexOf("\n  }\n", iniChat) + 5;
  s = s.slice(0, iniChat) + chatNuevo + s.slice(finChat);

  // 2) Métodos que aún no existen
  if (nivel < 7) { s = quitarMetodo(s, "orquestar"); s = quitarMetodo(s, "sintetizar"); }
  if (nivel < 6) s = quitarMetodo(s, "planificar");
  if (nivel < 5) {
    s = reemplazarObligatorio(
      s,
      /    \/\/ Las observaciones que son instrucciones de una skill[\s\S]*?      : `No necesito herramientas para esto\. \(mock\) Pregunta: \$\{pregunta\.slice\(0, 80\)\}`;\n/,
      "    const respuesta = observaciones.length\n      ? `Con lo que obtuve: ${observaciones.join(\" | \")}`\n      : `No necesito herramientas para esto. (mock) Pregunta: ${pregunta.slice(0, 80)}`;\n",
      "mock sin skills (respuesta)",
    );
    s = reemplazarObligatorio(s, /    \/\/ Si piden un "reporte\/informe"[\s\S]*?\n    }\n/, "", "mock sin skills (reporte)");
  }
  if (nivel < 4) { s = quitarMetodo(s, "reaccionar"); s = quitarMetodo(s, "herramientasNecesarias"); }

  // 3) Opciones y errores (aparecen con el Fallback)
  if (nivel < 2) {
    s = reemplazarObligatorio(s, `import { ErrorLLM, type LLMProvider, type Mensaje } from "../types.js";\nimport { dormir } from "../../util/http.js";\n`, `import type { LLMProvider, Mensaje } from "../types.js";\n`, "mock imports");
    s = reemplazarObligatorio(
      s,
      "  /** Simula una caída del proveedor (para practicar el fallback). */\n  fallar?: boolean;\n  /** Latencia artificial en milisegundos. */\n  latenciaMs?: number;\n",
      "",
      "mock opciones",
    );
  }
  return s;
}

// ---------------------------------------------------------------- otras variantes
function consolaVariante(final, paso) {
  if (paso >= 5) return final;
  let s = reemplazarObligatorio(final, `import { createInterface } from "node:readline/promises";\n\n`, "", "consola import");
  s = reemplazarObligatorio(s, /\n\/\*\* Lector de consola reutilizable[\s\S]*$/, "", "consola lector");
  return s;
}

function factoryVariante(final, paso) {
  if (paso >= 4) return final;
  if (paso < 3) {
    return `import { env } from "../config.js";
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
      throw new Error(\`Proveedor desconocido: "\${nombre}". Por ahora solo existe: mock\`);
  }
}
`;
  }
  // paso 3: ya están Gemini, Cohere y Groq, pero todavía no el Fallback
  let s = reemplazarObligatorio(final, `import { FallbackProvider } from "./providers/fallback.js";\n`, "", "factory import fallback");
  s = reemplazarObligatorio(s, `"gemini" | "cohere" | "groq" | "mock" | "fallback"`, `"gemini" | "cohere" | "groq" | "mock"`, "factory tipo");
  s = reemplazarObligatorio(s, /    case "fallback": \{[\s\S]*?\n    }\n(?=    default:)/, "", "factory case fallback");
  s = reemplazarObligatorio(s, "gemini | cohere | groq | mock | fallback", "gemini | cohere | groq | mock", "factory mensaje");
  return s;
}

function bootstrapVariante(final, paso) {
  if (paso >= 7) return final;
  let s = reemplazarObligatorio(
    final,
    `import { CajaDeHerramientas } from "./tools/herramienta.js";\nimport { calculadora } from "./tools/calculadora.js";\nimport { buscarConocimiento, clima, hora } from "./tools/basicas.js";\n`,
    "",
    "bootstrap imports",
  );
  s = reemplazarObligatorio(s, /\/\*\* Caja con TODAS las herramientas de la clase\. \*\/\n.*\n\n\/\*\* Texto pasado por la terminal[\s\S]*?\n\n(?=\/\*\* Muestra un error)/, "", "bootstrap herramientas");
  return s;
}

function envVariante(final, paso) {
  if (paso >= 4) return final;
  if (paso < 3) {
    return `# Copia este archivo como ".env" (NUNCA lo subas a GitHub: está en .gitignore).
# Con LLM_PROVIDER=mock practicas SIN claves ni internet.

LLM_PROVIDER=mock
`;
  }
  let s = reemplazarObligatorio(final, /\n# Orden de la estrategia[\s\S]*$/, "", "env fallback");
  s = reemplazarObligatorio(s, "mock | gemini | cohere | groq | fallback", "mock | gemini | cohere | groq", "env lista");
  return s;
}

function packageVariante(final, paso) {
  const ini = final.indexOf('  "scripts": {\n') + '  "scripts": {\n'.length;
  const fin = final.indexOf("\n  },", ini);
  const lineas = final.slice(ini, fin).split("\n").map((l) => l.replace(/,$/, ""));
  const vivas = lineas.filter((l) => {
    const nombre = /"([^"]+)":/.exec(l)?.[1];
    return nombre !== undefined && (SCRIPT_DESDE[nombre] ?? 0) <= paso;
  });
  return final.slice(0, ini) + vivas.join(",\n") + final.slice(fin);
}

function verificarVariante(final, paso) {
  const iniciosBloque = [...final.matchAll(/^await prueba\(/gm)].map((m) => m.index);
  const finTexto = final.lastIndexOf("console.log(`\\n${process.exitCode");
  const prefijo = final.slice(0, iniciosBloque[0]);
  const sufijo = final.slice(finTexto);
  const bloques = iniciosBloque.map((ini, i) => final.slice(ini, i + 1 < iniciosBloque.length ? iniciosBloque[i + 1] : finTexto));

  const elegidos = bloques.filter((b) => {
    const nombre = /^await prueba\("([^"]+)"/.exec(b)?.[1] ?? "";
    const regla = PRUEBA_DESDE.find(([re]) => re.test(nombre));
    if (!regla) throw new Error(`Prueba sin paso asignado: ${nombre}`);
    return regla[1] <= paso;
  });

  let cabecera = prefijo;
  if (paso < 7) cabecera = reemplazarObligatorio(cabecera, /const todas = .*\n\n/, "", "verificar helper todas");
  const cuerpo = cabecera.split("\n");
  const restoTexto = elegidos.join("") + sufijo;
  const salida = [];
  for (const linea of cuerpo) {
    const imp = /^import (?:type )?(?:(\w+)|\{([^}]*)\}) from /.exec(linea);
    if (!imp) { salida.push(linea); continue; }
    const nombres = imp[1] ? [imp[1]] : imp[2].split(",").map((n) => n.replace(/^\s*type\s+/, "").trim()).filter(Boolean);
    const resto = cuerpo.filter((l) => l !== linea && !l.startsWith("import ")).join("\n") + restoTexto;
    if (nombres.some((n) => new RegExp(`\\b${n}\\b`).test(resto))) salida.push(linea);
  }
  return salida.join("\n") + restoTexto;
}

// ---------------------------------------------------------------- API pública
export function crearGeneradorDeEstados(carpetaFinal) {
  const leer = (ruta) => fs.readFileSync(path.join(carpetaFinal, ruta), "utf8").replace(/\r\n/g, "\n");

  /** Devuelve Map<ruta, contenido> con el proyecto tal como queda al terminar el paso `paso`. */
  function estado(paso) {
    const mapa = new Map();
    for (const f of MANIFIESTO) {
      if (paso < f.desde || (f.hasta !== undefined && paso > f.hasta)) continue;
      if (f.inline) { mapa.set(f.ruta, INLINE[f.ruta]); continue; }
      const final = leer(f.ruta);
      let contenido = final;
      if (paso < ULTIMO_PASO) {
        switch (f.variante) {
          case "mock": contenido = mockVariante(final, nivelMock(paso)); break;
          case "consola": contenido = consolaVariante(final, paso); break;
          case "factory": contenido = factoryVariante(final, paso); break;
          case "bootstrap": contenido = bootstrapVariante(final, paso); break;
          case "env": contenido = envVariante(final, paso); break;
          case "package": contenido = packageVariante(final, paso); break;
          case "verificar": contenido = verificarVariante(final, paso); break;
          default: break;
        }
      }
      mapa.set(f.ruta, contenido);
    }
    return mapa;
  }

  /** Comprueba que el estado del último paso sea idéntico al proyecto final. */
  function compararConFinal() {
    const faltantes = [], distintos = [];
    const ultimo = estado(ULTIMO_PASO);
    const lista = (dir, base = "") => fs.readdirSync(path.join(dir, base), { withFileTypes: true }).flatMap((e) => {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) return ["node_modules", ".git"].includes(e.name) ? [] : lista(dir, rel);
      return [rel];
    });
    for (const rel of lista(carpetaFinal)) {
      if (["package-lock.json", ".env"].includes(rel)) continue;
      if (!ultimo.has(rel)) faltantes.push(rel);
      else if (ultimo.get(rel) !== leer(rel)) distintos.push(rel);
    }
    return { faltantes, distintos };
  }

  return { estado, compararConFinal };
}
