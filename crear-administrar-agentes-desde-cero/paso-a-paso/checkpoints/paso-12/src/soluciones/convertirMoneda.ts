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
