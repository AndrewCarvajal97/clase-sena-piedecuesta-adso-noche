import { ErrorLLM } from "../llm/types.js";

/**
 * POST JSON con reintentos simples.
 * Reintenta solo cuando tiene sentido: 429 (límite de uso) y errores 5xx.
 * Es una de las "buenas prácticas de producción" que veremos en clase.
 */
export async function postJson(
  proveedor: string,
  url: string,
  headers: Record<string, string>,
  cuerpo: unknown,
  { reintentos = 2, timeoutMs = 30_000 } = {},
): Promise<any> {
  let ultimoError: ErrorLLM | undefined;

  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (resp.ok) return await resp.json();

      const detalle = (await resp.text()).slice(0, 300);
      ultimoError = new ErrorLLM(proveedor, `HTTP ${resp.status}: ${detalle}`, resp.status);

      const reintentable = resp.status === 429 || resp.status >= 500;
      if (!reintentable) throw ultimoError;
    } catch (e) {
      if (e instanceof ErrorLLM && !(e.status === 429 || (e.status ?? 0) >= 500)) throw e;
      ultimoError =
        e instanceof ErrorLLM ? e : new ErrorLLM(proveedor, `Fallo de red: ${(e as Error).message}`);
    }

    if (intento < reintentos) await dormir(800 * 2 ** intento); // espera exponencial
  }
  throw ultimoError!;
}

export const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
