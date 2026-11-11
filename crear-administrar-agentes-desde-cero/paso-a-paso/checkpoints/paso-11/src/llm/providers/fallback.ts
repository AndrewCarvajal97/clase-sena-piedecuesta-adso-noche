import { ErrorLLM, type LLMProvider, type Mensaje, type OpcionesChat } from "../types.js";

/**
 * Estrategia COMPUESTA — prueba varios proveedores en orden.
 * Si el primero falla (límite de cuota, caída, timeout…), pasa al siguiente.
 * Observa: ¡también implementa LLMProvider! El agente no nota la diferencia.
 */
export class FallbackProvider implements LLMProvider {
  readonly nombre: string;
  /** Registro de a quién se le pidió y qué pasó (para mostrar en clase). */
  readonly bitacora: string[] = [];

  constructor(private readonly cadena: LLMProvider[]) {
    if (!cadena.length) throw new Error("FallbackProvider necesita al menos un proveedor");
    this.nombre = `fallback[${cadena.map((p) => p.nombre).join(" → ")}]`;
  }

  async chat(mensajes: Mensaje[], op?: OpcionesChat): Promise<string> {
    const errores: string[] = [];
    for (const proveedor of this.cadena) {
      try {
        const respuesta = await proveedor.chat(mensajes, op);
        this.bitacora.push(`✅ ${proveedor.nombre}`);
        return respuesta;
      } catch (e) {
        const msg = (e as Error).message;
        this.bitacora.push(`❌ ${proveedor.nombre} — ${msg.slice(0, 80)}`);
        errores.push(msg);
      }
    }
    throw new ErrorLLM(this.nombre, `Todos los proveedores fallaron:\n  - ${errores.join("\n  - ")}`);
  }
}
