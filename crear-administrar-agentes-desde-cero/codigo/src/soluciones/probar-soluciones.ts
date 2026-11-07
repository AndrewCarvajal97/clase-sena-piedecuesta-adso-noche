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
