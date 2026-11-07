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
