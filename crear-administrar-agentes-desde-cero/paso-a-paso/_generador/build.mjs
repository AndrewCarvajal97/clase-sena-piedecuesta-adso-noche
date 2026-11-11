/**
 * Generador del tutorial paso a paso.
 *
 *   node paso-a-paso/_generador/build.mjs              → genera todo y VERIFICA cada paso
 *   node paso-a-paso/_generador/build.mjs --sin-comandos → genera sin ejecutar los comandos (más rápido)
 *
 * Qué hace:
 *   1. Deriva el estado del proyecto en cada paso a partir de ../codigo (la fuente de verdad).
 *   2. Escribe checkpoints/paso-NN/ (el proyecto completo hasta ese paso).
 *   3. Comprueba que el paso 12 sea IDÉNTICO al proyecto final.
 *   4. Verifica cada paso: tsc --noEmit y ejecuta los comandos para capturar la salida real.
 *   5. Escribe pasos/*.md, index.html y README.md.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { crearGeneradorDeEstados, ULTIMO_PASO } from "./variantes.mjs";
import { inicio, pasos } from "./pasos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TUTORIAL = path.resolve(AQUI, "..");
const FINAL = path.resolve(TUTORIAL, "../codigo");
const CHECK = path.join(TUTORIAL, "checkpoints");
const MD = path.join(TUTORIAL, "pasos");
const SIN_COMANDOS = process.argv.includes("--sin-comandos");
const NOMBRE_PROYECTO = "agentes-desde-cero";

const nn = (n) => String(n).padStart(2, "0");
const quitarAnsi = (t) => t.replace(/\x1b\[[0-9;]*m/g, "");
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (t) => esc(t).replace(/"/g, "&quot;");

/** Convierte `código` en <code>código</code> (HTML). */
const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

// ------------------------------------------------------------------ limpieza segura
function limpiarCheckpoints() {
  if (!fs.existsSync(CHECK)) return;
  for (const d of fs.readdirSync(CHECK)) {
    const nm = path.join(CHECK, d, "node_modules");
    if (fs.existsSync(nm) || fs.lstatSync(path.join(CHECK, d)).isSymbolicLink()) {
      try { if (fs.lstatSync(nm).isSymbolicLink()) fs.rmdirSync(nm); } catch { /* no existe */ }
    }
  }
  fs.rmSync(CHECK, { recursive: true, force: true });
}

// ------------------------------------------------------------------ diff por líneas (LCS)
function diffLineas(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push([" ", a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(["-", a[i++]]); }
    else { ops.push(["+", b[j++]]); }
  }
  while (i < n) ops.push(["-", a[i++]]);
  while (j < m) ops.push(["+", b[j++]]);
  return ops;
}

/** Recorta el diff dejando 2 líneas de contexto alrededor de cada cambio. */
function diffConContexto(ops, ctx = 2) {
  const cambiado = ops.map(([t]) => t !== " ");
  const visible = ops.map((_, i) => { for (let k = Math.max(0, i - ctx); k <= Math.min(ops.length - 1, i + ctx); k++) if (cambiado[k]) return true; return false; });
  const salida = [];
  let saltando = false;
  ops.forEach((op, i) => {
    if (visible[i]) { saltando = false; salida.push(op); }
    else if (!saltando) { saltando = true; salida.push(["…", "…"]); }
  });
  return salida;
}

// ------------------------------------------------------------------ árbol de carpetas
function arbol(rutas, nuevos, cambiados) {
  const raiz = {};
  for (const r of rutas) {
    const partes = r.split("/");
    let nodo = raiz;
    partes.forEach((p, i) => { if (i === partes.length - 1) nodo[p] = null; else nodo = nodo[p] ??= {}; });
  }
  const lineas = [`${NOMBRE_PROYECTO}/`];
  const render = (nodo, prefijo, acum) => {
    const entradas = Object.entries(nodo).sort(([a, va], [b, vb]) => (vb !== null) - (va !== null) || a.localeCompare(b));
    entradas.forEach(([nombre, hijo], i) => {
      const ultimo = i === entradas.length - 1;
      const ruta = acum ? `${acum}/${nombre}` : nombre;
      const marca = hijo === null ? (nuevos.has(ruta) ? "   🆕" : cambiados.has(ruta) ? "   ✏️" : "") : "";
      lineas.push(`${prefijo}${ultimo ? "└── " : "├── "}${nombre}${hijo === null ? "" : "/"}${marca}`);
      if (hijo !== null) render(hijo, prefijo + (ultimo ? "    " : "│   "), ruta);
    });
  };
  render(raiz, "", "");
  return lineas.join("\n");
}

// ------------------------------------------------------------------ ejecución real de comandos
function ejecutar(cmd, cwd) {
  const r = spawnSync("cmd.exe", ["/d", "/s", "/c", cmd], {
    cwd, encoding: "utf8", timeout: 120_000,
    env: { ...process.env, LLM_PROVIDER: "mock", FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const texto = quitarAnsi(((r.stdout ?? "") + (r.stderr ?? "")).replace(/\r\n/g, "\n")).replace(/[ \t]+$/gm, "").trim();
  return { codigo: r.status, texto };
}

function recortar(texto, max = 70) {
  const l = texto.split("\n");
  return l.length <= max ? texto : l.slice(0, max).join("\n") + `\n… (salida recortada: ${l.length - max} líneas más)`;
}

// ================================================================== 1) estados y checkpoints
const gen = crearGeneradorDeEstados(FINAL);
console.log("▶ Generando estados de cada paso…");
const estados = [];
for (let n = 0; n <= ULTIMO_PASO; n++) estados.push(gen.estado(n));

const cmp = gen.compararConFinal();
if (cmp.faltantes.length || cmp.distintos.length) {
  console.error("❌ El paso final NO reproduce el proyecto:", cmp);
  process.exit(1);
}
console.log("✅ El paso 12 reproduce el proyecto final byte a byte.");

limpiarCheckpoints();
for (let n = 0; n <= ULTIMO_PASO; n++) {
  for (const [ruta, contenido] of estados[n]) {
    const destino = path.join(CHECK, `paso-${nn(n)}`, ruta);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, contenido);
  }
}

// ================================================================== 2) verificación y salidas reales
const salidas = {}; // salidas[paso][indice] = texto
const tsc = path.join(FINAL, "node_modules/typescript/lib/tsc.js");
let hayErrores = false;

for (let n = 0; n <= ULTIMO_PASO; n++) {
  const dir = path.join(CHECK, `paso-${nn(n)}`);
  fs.symlinkSync(path.join(FINAL, "node_modules"), path.join(dir, "node_modules"), "junction");
  try {
    const t = spawnSync("node", [tsc, "--noEmit", "-p", dir], { encoding: "utf8" });
    console.log(`  paso ${nn(n)} · tsc ${t.status === 0 ? "OK" : "ERROR"}`);
    if (t.status !== 0) { hayErrores = true; console.error((t.stdout + t.stderr).slice(0, 1500)); }

    salidas[n] = [];
    pasos[n].ejecutar.forEach((e, i) => {
      if (SIN_COMANDOS || e.manual || !e.run) { salidas[n][i] = null; return; }
      const r = ejecutar(e.run, dir);
      if (r.codigo !== 0) { hayErrores = true; console.error(`  ❌ paso ${nn(n)} · «${e.run}» salió con código ${r.codigo}\n${r.texto.slice(0, 1200)}`); }
      else console.log(`      ✔ ${e.run}`);
      salidas[n][i] = recortar(r.texto);
    });
  } finally {
    fs.rmdirSync(path.join(dir, "node_modules")); // quita SOLO el enlace, nunca el contenido
  }
}
if (hayErrores) { console.error("\n❌ Hay pasos con errores. Revisa los mensajes anteriores."); process.exit(1); }
console.log("✅ Todos los pasos compilan y sus comandos se ejecutan.");

// ================================================================== 3) modelo de datos por paso
const datos = pasos.map((p, n) => {
  const previo = n > 0 ? estados[n - 1] : new Map();
  const actual = estados[n];
  const nuevos = new Set(), cambiados = new Set(), eliminados = [];
  for (const [ruta, c] of actual) { if (!previo.has(ruta)) nuevos.add(ruta); else if (previo.get(ruta) !== c) cambiados.add(ruta); }
  for (const ruta of previo.keys()) if (!actual.has(ruta)) eliminados.push(ruta);

  const orden = [...Object.keys(p.archivos), ...[...nuevos, ...cambiados].filter((r) => !(r in p.archivos))];
  const archivos = [];
  for (const ruta of orden) {
    if (!nuevos.has(ruta) && !cambiados.has(ruta)) { console.warn(`⚠️  Paso ${n}: «${ruta}» está descrito pero no cambia`); continue; }
    let info = p.archivos[ruta];
    const nuevo = nuevos.has(ruta);
    let ops = null;
    if (!nuevo) ops = diffConContexto(diffLineas(previo.get(ruta).split("\n"), actual.get(ruta).split("\n")));
    if (!info) {
      if (ruta === "package.json") {
        const anterior = new Set(previo.get(ruta)?.match(/"[^"]+": "(?:tsx|tsc)[^"]*"/g) ?? []);
        const agregados = (actual.get(ruta).match(/"([^"]+)": "(?:tsx|tsc)[^"]*"/g) ?? []).filter((l) => !anterior.has(l)).map((l) => l.split('"')[1]);
        info = nuevo
          ? null
          : { porque: `Se agregan los scripts de este paso: ${agregados.map((a) => `\`npm run ${a}\``).join(", ") || "(ninguno)"}. Los scripts son atajos para no recordar rutas largas.`, mira: [] };
      } else if (ruta === "src/verificar.ts") {
        const nombres = [...actual.get(ruta).matchAll(/^await prueba\("([^"]+)"/gm)].map((m) => m[1]);
        const previos = new Set([...(previo.get(ruta) ?? "").matchAll(/^await prueba\("([^"]+)"/gm)].map((m) => m[1]));
        const agregadas = nombres.filter((x) => !previos.has(x));
        info = { porque: `Se agregan las pruebas de este paso (${agregadas.length}): ${agregadas.map((a) => `«${a}»`).join("; ")}.`, mira: ["Probar cada capa justo después de construirla evita buscar errores dentro de un agente."] };
      }
    }
    if (!info) throw new Error(`Paso ${n}: falta describir «${ruta}» en pasos.mjs`);
    archivos.push({ ruta, nuevo, ...info, contenido: actual.get(ruta), ops });
  }
  const rutas = [...actual.keys()];
  return { ...p, archivos, eliminados, nuevos, cambiados, arbol: arbol(rutas, nuevos, cambiados), salidas: salidas[n] };
});

// ================================================================== 4) Markdown
const fenceDe = (t) => "`".repeat(Math.max(3, (t.match(/`+/g) ?? []).reduce((m, x) => Math.max(m, x.length), 0) + 1));
const lenguaDe = (r) => (r.endsWith(".ts") ? "ts" : r.endsWith(".mjs") ? "js" : r.endsWith(".json") ? "json" : r.endsWith(".md") ? "markdown" : "");
const bloque = (texto, lang = "") => { const f = fenceDe(texto); return `${f}${lang}\n${texto.replace(/\n$/, "")}\n${f}`; };

function markdownDePaso(d) {
  const L = [];
  L.push(`# Paso ${d.id} · ${d.titulo}`, "", `> **${d.nivel}** · ⏱ ~${d.minutos} min · [← Índice](../README.md)`, "");
  L.push("## 🎯 Qué construimos", "", d.objetivo, "");
  L.push("## ❓ Qué problema resuelve (por qué hacemos esto)", "", d.problema, "");
  L.push("## 🧠 Conceptos clave", "", ...d.conceptos.map((c) => `- **${c.t}:** ${c.d}`), "");
  L.push(`## 🗂️ Estructura de carpetas al terminar este paso`, "", "🆕 = archivo nuevo · ✏️ = archivo modificado en este paso", "", bloque(d.arbol), "");
  if (d.antes?.length) L.push("## 🛠️ Antes de empezar", "", bloque(d.antes.join("\n"), "bash"), "");
  L.push("## 👣 Qué crear", "");
  if (d.eliminados.length) L.push(`> 🗑️ **Borra** ${d.eliminados.map((e) => `\`${e}\``).join(", ")}: era un archivo temporal.`, "");
  d.archivos.forEach((a, i) => {
    L.push(`### ${i + 1}. \`${a.ruta}\` — ${a.nuevo ? "🆕 nuevo" : "✏️ modificado"}`, "", `**Por qué:** ${a.porque}`, "");
    if (a.mira?.length) L.push("**Qué mirar:**", "", ...a.mira.map((m) => `- ${m}`), "");
    if (!a.nuevo) {
      const dif = a.ops.map(([t, l]) => (t === "…" ? "  …" : `${t === " " ? " " : t} ${l}`)).join("\n");
      L.push("**Qué cambió respecto al paso anterior:**", "", bloque(dif, "diff"), "", "<details><summary>Ver el archivo completo (para reemplazarlo)</summary>", "", bloque(a.contenido, lenguaDe(a.ruta)), "", "</details>", "");
    } else L.push(bloque(a.contenido, lenguaDe(a.ruta)), "");
  });
  L.push("## ▶️ Ejecutar y comprobar", "");
  d.ejecutar.forEach((e, i) => {
    L.push(`**${i + 1}.** ${e.nota}`, "", bloque(e.cmd, "bash"), "");
    const s = d.salidas?.[i];
    if (s) L.push(`**Debes ver${e.variable ? " (los valores pueden variar)" : ""}:**`, "", bloque(s), "");
  });
  L.push("## ✅ Checkpoint", "", d.checkpoint, "", `Si te quedaste atrás, copia \`checkpoints/paso-${nn(d.id)}/\`, ejecuta \`npm install\` y continúa.`, "");
  L.push("## 💬 Preguntas para los aprendices", "", ...d.preguntas.map((p) => `- ${p}`), "");
  L.push("## 🚑 Errores comunes", "", "| Síntoma | Causa |", "|---|---|", ...d.errores.map((e) => `| ${e.s.replace(/\|/g, "\\|")} | ${e.c.replace(/\|/g, "\\|")} |`), "");
  L.push("## ➡️ Siguiente paso", "", d.siguiente, "");
  const sig = datos[d.id + 1], ant = datos[d.id - 1];
  L.push("---", `${ant ? `[← Paso ${ant.id}](${nn(ant.id)}-${ant.slug}.md)` : ""}${ant && sig ? " · " : ""}${sig ? `[Paso ${sig.id} →](${nn(sig.id)}-${sig.slug}.md)` : ""}`, "");
  return L.join("\n");
}

fs.rmSync(MD, { recursive: true, force: true });
fs.mkdirSync(MD, { recursive: true });
for (const d of datos) fs.writeFileSync(path.join(MD, `${nn(d.id)}-${d.slug}.md`), markdownDePaso(d));

// ================================================================== 5) README
const arbolFinal = arbol([...estados[ULTIMO_PASO].keys()], new Set(), new Set());
const totalMin = datos.reduce((s, d) => s + d.minutos, 0);
const readme = [
  `# ${inicio.titulo}`, "", `${inicio.subtitulo}.`, "",
  "Una guía para **programar en vivo** (o repasar) todo el proyecto del curso, desde un script vacío hasta un sistema multi-agente, entendiendo **por qué existe cada archivo y qué problema resuelve**.", "",
  "👉 **Abre [`index.html`](index.html)** en el navegador: es el visor interactivo (menú de pasos, botones de copiar, diferencias resaltadas). Los mismos pasos están en Markdown dentro de [`pasos/`](pasos/).", "",
  "## Cómo usarlo", "", ...inicio.comoUsar.map((c) => `- **${c.t}.** ${c.d}`), "",
  "## Principios de esta guía", "", ...inicio.principios.map(([t, d]) => `- **${t}.** ${d}`), "",
  `## Mapa de pasos (≈ ${Math.floor(totalMin / 60)} h ${totalMin % 60} min programando en vivo)`, "",
  "| Paso | Qué construimos | Nivel | Tiempo |", "|---:|---|---|---:|",
  ...datos.map((d) => `| ${d.id} | [${d.titulo}](pasos/${nn(d.id)}-${d.slug}.md) | ${d.nivel} | ${d.minutos} min |`), "",
  "## Estructura final y por qué existe cada parte", "", "| Carpeta / archivo | Qué es | Por qué existe | Paso |", "|---|---|---|---:|",
  ...inicio.estructura.map((e) => `| \`${e.ruta}\` | ${e.que} | ${e.porque} | ${e.paso} |`), "",
  "```", arbolFinal, "```", "",
  "## Contenido de esta carpeta", "",
  "```", "paso-a-paso/", "├── index.html          ← visor interactivo (¡empieza aquí!)", "├── pasos/              ← un archivo Markdown por paso", "├── checkpoints/        ← el proyecto completo al terminar cada paso (paso-00 … paso-12)", "└── _generador/         ← programa que construye y VERIFICA todo lo anterior", "```", "",
  "## Cómo se garantiza que no está desactualizado", "",
  "El código mostrado en cada paso **no se escribe a mano**: se deriva del proyecto real en [`../codigo`](../codigo). El generador comprueba que:", "",
  "1. el **paso 12 sea idéntico** al proyecto final, archivo por archivo;", "2. **cada paso compile** con `tsc` (13 checkpoints);", "3. **cada comando de cada paso se ejecute** y la salida que ves en «Debes ver» sea la real.", "",
  "Si cambias el código del proyecto, regenera con:", "", "```bash", "node paso-a-paso/_generador/build.mjs", "```", "",
].join("\n");
fs.writeFileSync(path.join(TUTORIAL, "README.md"), readme);

// ================================================================== 6) HTML (visor)
const CSS = `
:root{--verde:#39a900;--verde-osc:#2b7d00;--azul:#00304d;--azul2:#0b5c8a;--tinta:#1b2733;--gris:#5b6b7b;--gris-cl:#eef2f5;--amar:#ffcf3f;--rojo:#e5484d;--sombra:0 6px 24px rgba(0,48,77,.12);--mono:Consolas,"Courier New",monospace;--fuente:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{font-family:var(--fuente);background:#f4f7fa;color:var(--tinta);line-height:1.6;display:flex;min-height:100vh}
aside{width:310px;flex:none;background:var(--azul);color:#fff;position:sticky;top:0;height:100vh;overflow:auto;padding:18px 14px}
aside h1{font-size:1.02rem;line-height:1.25;margin-bottom:4px}aside h1 span{color:#8bd86a}
aside .sub{font-size:.78rem;color:#bfe6ff;margin-bottom:12px}
.prog{height:8px;background:rgba(255,255,255,.18);border-radius:99px;overflow:hidden;margin:6px 0 2px}.prog i{display:block;height:100%;background:var(--verde);width:0;transition:width .3s}
.progt{font-size:.74rem;color:#bfe6ff;margin-bottom:10px}
nav a{display:flex;gap:8px;align-items:flex-start;color:#e6f3ff;text-decoration:none;padding:7px 9px;border-radius:9px;font-size:.86rem;cursor:pointer}
nav a:hover{background:rgba(255,255,255,.1)}nav a.on{background:var(--verde);color:#fff;font-weight:700}
nav a .n{background:rgba(255,255,255,.2);border-radius:6px;min-width:26px;text-align:center;font-weight:800;font-size:.78rem;padding:1px 4px}
nav a.hecho .n{background:#8bd86a;color:#0b3d00}
nav .grupo{font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:#8fd3ff;margin:12px 6px 3px}
main{flex:1;min-width:0;max-width:1000px;margin:0 auto;padding:26px 28px 80px}
section.paso,#inicio{display:none}section.paso.on,#inicio.on{display:block}
.cab{background:linear-gradient(135deg,var(--azul),var(--azul2));color:#fff;border-radius:16px;padding:20px 24px;margin-bottom:18px;box-shadow:var(--sombra)}
.cab .nivel{display:inline-block;background:var(--verde);border-radius:999px;padding:2px 12px;font-weight:700;font-size:.8rem}
.cab h2{font-size:1.65rem;margin:8px 0 2px;line-height:1.2}.cab p{color:#d6ecff}
h3.sec{color:var(--azul);margin:26px 0 8px;font-size:1.12rem;border-bottom:3px solid var(--verde);padding-bottom:3px;display:inline-block}
.caja{border-left:6px solid var(--verde);background:#eef8e6;border-radius:10px;padding:10px 15px;margin:8px 0}
.caja.ojo{border-color:var(--amar);background:#fff8e2}.caja.mal{border-color:var(--rojo);background:#fdecec}.caja.info{border-color:var(--azul2);background:#e7f3fb}
.tarjetas{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.tarjeta{background:#fff;border-radius:12px;padding:11px 14px;box-shadow:var(--sombra);border-top:5px solid var(--verde)}.tarjeta b{color:var(--azul)}
code{font-family:var(--mono);background:var(--gris-cl);color:#b5179e;padding:1px 6px;border-radius:5px;font-size:.9em}
pre{background:#0d1b2a;color:#e6edf3;padding:13px 15px;border-radius:12px;overflow:auto;font-size:.82rem;line-height:1.5;border-left:5px solid var(--verde);font-family:var(--mono)}
pre code{background:none;color:inherit;padding:0;font-size:inherit}
.arbol{background:#fff;color:var(--tinta);border:2px solid #cdd8e1;border-left:5px solid var(--azul2);white-space:pre}
.k{color:#ff7b9c}.s{color:#9ef08c}.c{color:#7f97ad;font-style:italic}.nm{color:#ffd479}
.archivo{background:#fff;border-radius:14px;box-shadow:var(--sombra);padding:14px 18px;margin:14px 0;border:1px solid #e1e8ee}
.archivo header{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.archivo header code{font-size:.95rem;color:var(--azul);background:#e7f3fb;font-weight:700}
.badge{font-size:.72rem;font-weight:800;border-radius:999px;padding:2px 10px}.badge.nuevo{background:#d9f2c9;color:#1f5e00}.badge.mod{background:#fff0bd;color:#7a5600}
.copiar{margin-left:auto;border:none;background:var(--azul);color:#fff;border-radius:8px;padding:5px 12px;font:inherit;font-weight:700;font-size:.8rem;cursor:pointer}.copiar:hover{background:var(--verde-osc)}
.porque{margin:4px 0}.mira{margin:6px 0 8px 20px}.mira li{margin:3px 0}
details{margin:8px 0}summary{cursor:pointer;font-weight:700;color:var(--azul2);padding:3px 0}
.diff{background:#0d1b2a}.diff div{white-space:pre;padding:0 4px}.diff .mas{background:rgba(57,169,0,.22);color:#b8f5a0}.diff .menos{background:rgba(229,72,77,.22);color:#ffb3b5}.diff .sal{color:#7f97ad}
.cmd{background:#fff;border-radius:12px;padding:11px 15px;margin:10px 0;border:1px solid #e1e8ee;box-shadow:var(--sombra)}.cmd .nota{margin-bottom:6px}
.sal-titulo{font-size:.8rem;font-weight:800;color:var(--verde-osc);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 3px}
.salida{background:#102a1a;border-left-color:#8bd86a}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:.92rem;background:#fff;border-radius:10px;overflow:hidden}th,td{border:1px solid #cdd8e1;padding:7px 10px;text-align:left;vertical-align:top}th{background:var(--azul);color:#fff}tr:nth-child(even) td{background:#f4f8fb}
ul.lista{margin:6px 0 6px 20px}ul.lista li{margin:4px 0}
.nav2{display:flex;gap:10px;justify-content:space-between;margin:28px 0 8px;flex-wrap:wrap}
.btn{border:none;background:var(--verde);color:#fff;font:inherit;font-weight:700;padding:9px 18px;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-block}.btn:hover{background:var(--verde-osc)}.btn.sec{background:var(--azul)}.btn.gris{background:#8798a8}
.check{display:flex;gap:10px;align-items:center;margin:14px 0}
@media(max-width:860px){body{flex-direction:column}aside{width:100%;height:auto;position:relative}main{padding:18px 14px 60px}}
@media print{aside,.nav2,.copiar{display:none}section.paso{display:block!important;page-break-after:always}body{display:block}}
`;

const JS = fs.readFileSync(path.join(AQUI, "visor.js"), "utf8");

function htmlCodigo(texto, ruta, id) {
  const lang = ruta.endsWith(".ts") || ruta.endsWith(".mjs") ? "ts" : "txt";
  return `<pre><code id="${id}" data-lang="${lang}">${esc(texto.replace(/\n$/, ""))}</code></pre>`;
}

function htmlDePaso(d) {
  const sig = datos[d.id + 1], ant = datos[d.id - 1];
  const H = [];
  H.push(`<section class="paso" id="paso-${d.id}" data-paso="paso-${d.id}">`);
  H.push(`<div class="cab"><span class="nivel">${esc(d.nivel)}</span> <span class="nivel" style="background:rgba(255,255,255,.2)">⏱ ~${d.minutos} min</span><h2>Paso ${d.id} · ${esc(d.titulo)}</h2><p>${inline(d.objetivo)}</p></div>`);
  H.push(`<h3 class="sec">❓ Qué problema resuelve</h3><div class="caja ojo">${inline(d.problema)}</div>`);
  H.push(`<h3 class="sec">🧠 Conceptos clave</h3><div class="tarjetas">${d.conceptos.map((c) => `<div class="tarjeta"><b>${esc(c.t)}</b><br>${inline(c.d)}</div>`).join("")}</div>`);
  H.push(`<h3 class="sec">🗂️ Estructura al terminar este paso</h3><p style="margin:4px 0 6px"><small>🆕 nuevo · ✏️ modificado en este paso</small></p><pre class="arbol">${esc(d.arbol)}</pre>`);
  if (d.antes?.length) H.push(`<h3 class="sec">🛠️ Antes de empezar</h3><pre><code>${esc(d.antes.join("\n"))}</code></pre>`);
  H.push(`<h3 class="sec">👣 Qué crear</h3>`);
  if (d.eliminados.length) H.push(`<div class="caja mal">🗑️ <strong>Borra</strong> ${d.eliminados.map((e) => `<code>${esc(e)}</code>`).join(", ")}: era un archivo temporal.</div>`);
  d.archivos.forEach((a, i) => {
    const id = `c-${d.id}-${i}`;
    H.push(`<article class="archivo"><header><span class="badge ${a.nuevo ? "nuevo" : "mod"}">${a.nuevo ? "🆕 Nuevo" : "✏️ Modificado"}</span><code>${esc(a.ruta)}</code><button class="copiar" data-t="${id}">Copiar</button></header>`);
    H.push(`<p class="porque"><strong>Por qué:</strong> ${inline(a.porque)}</p>`);
    if (a.mira?.length) H.push(`<ul class="mira">${a.mira.map((m) => `<li>${inline(m)}</li>`).join("")}</ul>`);
    if (!a.nuevo) {
      const dif = a.ops.map(([t, l]) => `<div class="${t === "+" ? "mas" : t === "-" ? "menos" : "sal"}">${esc(t === "…" ? "  …" : `${t === " " ? " " : t} ${l}`)}</div>`).join("");
      H.push(`<details open><summary>Qué cambió respecto al paso anterior</summary><pre class="diff">${dif}</pre></details>`);
      H.push(`<details><summary>Ver el archivo completo (para reemplazarlo)</summary>${htmlCodigo(a.contenido, a.ruta, id)}</details>`);
    } else H.push(`<details open><summary>Código</summary>${htmlCodigo(a.contenido, a.ruta, id)}</details>`);
    H.push(`</article>`);
  });
  H.push(`<h3 class="sec">▶️ Ejecutar y comprobar</h3>`);
  d.ejecutar.forEach((e, i) => {
    const s = d.salidas?.[i];
    H.push(`<div class="cmd"><div class="nota"><strong>${i + 1}.</strong> ${inline(e.nota)}</div><pre><code>${esc(e.cmd)}</code></pre>${s ? `<div class="sal-titulo">Debes ver${e.variable ? " (los valores pueden variar)" : ""}</div><pre class="salida"><code>${esc(s)}</code></pre>` : ""}</div>`);
  });
  H.push(`<h3 class="sec">✅ Checkpoint</h3><div class="caja">${inline(d.checkpoint)}<br><small>¿Te quedaste atrás? Copia <code>checkpoints/paso-${nn(d.id)}/</code>, ejecuta <code>npm install</code> y continúa.</small></div>`);
  H.push(`<label class="check"><input type="checkbox" class="marcar" data-paso="paso-${d.id}"> <strong>Marcar este paso como completado</strong></label>`);
  H.push(`<h3 class="sec">💬 Preguntas para los aprendices</h3><ul class="lista">${d.preguntas.map((p) => `<li>${inline(p)}</li>`).join("")}</ul>`);
  H.push(`<h3 class="sec">🚑 Errores comunes</h3><table><tr><th>Síntoma</th><th>Causa</th></tr>${d.errores.map((e) => `<tr><td>${inline(e.s)}</td><td>${inline(e.c)}</td></tr>`).join("")}</table>`);
  H.push(`<div class="caja info">➡️ <strong>Siguiente:</strong> ${inline(d.siguiente)}</div>`);
  H.push(`<div class="nav2">${ant ? `<a class="btn gris" data-ir="paso-${ant.id}" href="#paso-${ant.id}">← Paso ${ant.id}</a>` : `<a class="btn gris" data-ir="inicio" href="#inicio">← Inicio</a>`}${sig ? `<a class="btn" data-ir="paso-${sig.id}" href="#paso-${sig.id}">Paso ${sig.id} →</a>` : `<a class="btn" data-ir="inicio" href="#inicio">Volver al inicio</a>`}</div>`);
  H.push(`</section>`);
  return H.join("\n");
}

const grupos = [];
for (const d of datos) { const g = grupos.at(-1); if (g && g.nivel === d.nivel.split(" · ")[0]) g.items.push(d); else grupos.push({ nivel: d.nivel.split(" · ")[0], items: [d] }); }

const navHtml = [
  `<a data-ir="inicio" href="#inicio" class="on"><span class="n">🏠</span><span>Inicio y mapa</span></a>`,
  ...grupos.flatMap((g) => [`<div class="grupo">${esc(g.nivel)}</div>`, ...g.items.map((d) => `<a data-ir="paso-${d.id}" data-paso="paso-${d.id}" href="#paso-${d.id}"><span class="n">${d.id}</span><span>${esc(d.titulo)}</span></a>`)]),
].join("\n");

const inicioHtml = `
<section id="inicio" class="on">
  <div class="cab"><span class="nivel">Guía para el instructor y los aprendices</span><h2>${esc(inicio.titulo)}</h2><p>${esc(inicio.subtitulo)}</p></div>
  <h3 class="sec">🧭 Cómo usar esta guía</h3>
  <div class="tarjetas">${inicio.comoUsar.map((c) => `<div class="tarjeta"><b>${esc(c.t)}</b><br>${esc(c.d)}</div>`).join("")}</div>
  <h3 class="sec">🧱 Principios</h3>
  <ul class="lista">${inicio.principios.map(([t, d]) => `<li><strong>${esc(t)}.</strong> ${esc(d)}</li>`).join("")}</ul>
  <h3 class="sec">🗺️ Mapa de pasos (≈ ${Math.floor(totalMin / 60)} h ${totalMin % 60} min programando en vivo)</h3>
  <table><tr><th>Paso</th><th>Qué construimos</th><th>Nivel</th><th>Tiempo</th></tr>
  ${datos.map((d) => `<tr><td><strong>${d.id}</strong></td><td><a data-ir="paso-${d.id}" href="#paso-${d.id}">${esc(d.titulo)}</a></td><td>${esc(d.nivel)}</td><td>${d.minutos} min</td></tr>`).join("")}</table>
  <h3 class="sec">🗂️ Estructura final y por qué existe cada parte</h3>
  <table><tr><th>Carpeta / archivo</th><th>Qué es</th><th>Por qué existe</th><th>Paso</th></tr>
  ${inicio.estructura.map((e) => `<tr><td><code>${esc(e.ruta)}</code></td><td>${esc(e.que)}</td><td>${esc(e.porque)}</td><td><a data-ir="paso-${e.paso}" href="#paso-${e.paso}">${e.paso}</a></td></tr>`).join("")}</table>
  <pre class="arbol">${esc(arbolFinal)}</pre>
  <h3 class="sec">✅ Cómo se garantiza que está al día</h3>
  <div class="caja">El código de cada paso <strong>se deriva del proyecto real</strong> (<code>../codigo</code>). El generador comprueba que el paso 12 sea idéntico al proyecto final, que cada checkpoint compile con <code>tsc</code> y que cada comando se ejecute: la salida de «Debes ver» es la real.</div>
  <div class="nav2"><span></span><a class="btn" data-ir="paso-0" href="#paso-0">Empezar en el Paso 0 →</a></div>
</section>`;

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agentes de IA desde cero · paso a paso</title><style>${CSS}</style></head>
<body>
<aside><h1>Agentes de IA <span>desde cero</span></h1><div class="sub">Paso a paso · TypeScript · Node · Strategy</div>
<div class="prog"><i></i></div><div class="progt"></div>
<nav>${navHtml}</nav></aside>
<main>${inicioHtml}
${datos.map(htmlDePaso).join("\n")}
</main>
<script>${JS}</script></body></html>`;
fs.writeFileSync(path.join(TUTORIAL, "index.html"), html);

console.log(`\n✅ Listo: ${datos.length} pasos · ${ULTIMO_PASO + 1} checkpoints · index.html · README.md · pasos/*.md`);
