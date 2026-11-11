/**
 * Los LLM a veces envuelven el JSON en ```json ... ``` o añaden texto extra.
 * Esta función es el "limpiador": encuentra el primer objeto JSON válido.
 */
export function extraerJson<T = any>(texto: string): T {
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const ini = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (ini === -1 || fin <= ini) throw new Error("No encontré un objeto JSON en la respuesta");
  return JSON.parse(limpio.slice(ini, fin + 1)) as T;
}
