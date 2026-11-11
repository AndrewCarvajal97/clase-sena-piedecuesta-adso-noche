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
