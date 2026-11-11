import type { Herramienta } from "./herramienta.js";

/** Hora actual en Colombia. Un LLM NO sabe la fecha de hoy: hay que dársela con una herramienta. */
export const hora: Herramienta = {
  nombre: "hora",
  descripcion: "Devuelve la fecha y hora actual en Colombia. No necesita entrada.",
  ejemploEntrada: "",
  ejecutar: () =>
    new Intl.DateTimeFormat("es-CO", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(new Date()),
};

/**
 * Clima con datos de EJEMPLO (offline y predecible para la clase).
 * 🏆 Reto: reemplázala por una llamada real a https://open-meteo.com (no pide clave).
 */
const CLIMAS: Record<string, string> = {
  bogota: "14 °C, nublado",
  bucaramanga: "24 °C, parcialmente soleado",
  piedecuesta: "25 °C, soleado",
  medellin: "22 °C, lluvias ligeras",
  cali: "27 °C, soleado",
  cartagena: "31 °C, húmedo",
};
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const clima: Herramienta = {
  nombre: "clima",
  descripcion: "Consulta el clima actual de una ciudad colombiana. La entrada es SOLO el nombre de la ciudad.",
  ejemploEntrada: "Bucaramanga",
  ejecutar: (ciudad) => {
    const dato = CLIMAS[sinTildes(ciudad)];
    if (!dato) throw new Error(`No tengo datos de "${ciudad}". Ciudades: ${Object.keys(CLIMAS).join(", ")}`);
    return `Clima en ${ciudad.trim()}: ${dato} (datos de ejemplo)`;
  },
};

/** Mini base de conocimiento: antesala de RAG (clase 4 del curso). */
const CONOCIMIENTO: { claves: string[]; texto: string }[] = [
  { claves: ["agente", "agentes"], texto: "Un agente es un programa que usa un LLM para decidir qué acciones tomar (herramientas) en un bucle hasta cumplir un objetivo." },
  { claves: ["llm", "modelo de lenguaje"], texto: "Un LLM es un modelo entrenado con enormes cantidades de texto que predice el siguiente token; por eso puede conversar, resumir y razonar." },
  { claves: ["token", "tokens"], texto: "Un token es un trozo de texto (≈ 4 caracteres). Los proveedores cobran y limitan el uso por tokens de entrada y salida." },
  { claves: ["strategy", "estrategia"], texto: "Strategy es un patrón de diseño: varias clases intercambiables que cumplen la misma interfaz, elegidas en tiempo de ejecución." },
  { claves: ["react"], texto: "ReAct (Reason + Act) es un patrón donde el agente alterna: pensar, actuar con una herramienta y observar el resultado, en bucle." },
  { claves: ["rag"], texto: "RAG (Retrieval-Augmented Generation) busca fragmentos relevantes en tus documentos y se los entrega al LLM para que responda con datos reales." },
  { claves: ["prompt", "system prompt"], texto: "El system prompt son las instrucciones permanentes del agente: su rol, reglas y formato de respuesta." },
];

export const buscarConocimiento: Herramienta = {
  nombre: "buscar_conocimiento",
  descripcion: "Busca definiciones de términos de IA (agente, llm, token, strategy, react, rag, prompt). La entrada es el término.",
  ejemploEntrada: "token",
  ejecutar: (consulta) => {
    const q = sinTildes(consulta);
    const hallado = CONOCIMIENTO.find((c) => c.claves.some((k) => q.includes(k) || k.includes(q)));
    if (!hallado) throw new Error(`No encontré "${consulta}" en la base de conocimiento`);
    return hallado.texto;
  },
};
