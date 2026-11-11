import type { Herramienta } from "./herramienta.js";

/**
 * Evaluador matemático SEGURO (descenso recursivo).
 * ⚠️ NUNCA uses eval() con texto que viene de un LLM: es una puerta abierta
 * para ejecutar código malicioso (inyección de prompts). Este parser solo
 * entiende números, + - * / % ^ y paréntesis.
 *
 * Gramática:  expr  := term (('+'|'-') term)*
 *             term  := pot  (('*'|'/'|'%') pot)*
 *             pot   := unario ('^' pot)?
 *             unario:= '-' unario | '(' expr ')' | número
 */
export function evaluar(texto: string): number {
  const s = texto.replace(/\s+/g, "").replace(/,/g, ".");
  if (!/^[\d+\-*/%^().]+$/.test(s)) throw new Error(`Caracteres no permitidos en "${texto}"`);
  let i = 0;

  const peek = () => s[i];
  const expr = (): number => {
    let v = term();
    while (peek() === "+" || peek() === "-") v = s[i++] === "+" ? v + term() : v - term();
    return v;
  };
  const term = (): number => {
    let v = pot();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = s[i++];
      const d = pot();
      if ((op === "/" || op === "%") && d === 0) throw new Error("División por cero");
      v = op === "*" ? v * d : op === "/" ? v / d : v % d;
    }
    return v;
  };
  const pot = (): number => {
    const base = unario();
    if (peek() === "^") {
      i++;
      return base ** pot();
    }
    return base;
  };
  const unario = (): number => {
    if (peek() === "-") {
      i++;
      return -unario();
    }
    if (peek() === "(") {
      i++;
      const v = expr();
      if (s[i++] !== ")") throw new Error("Falta cerrar paréntesis");
      return v;
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`Se esperaba un número en la posición ${i}`);
    i += m[0].length;
    return parseFloat(m[0]);
  };

  const resultado = expr();
  if (i < s.length) throw new Error(`Sobra texto desde la posición ${i}: "${s.slice(i)}"`);
  return resultado;
}

export const calculadora: Herramienta = {
  nombre: "calculadora",
  descripcion: "Resuelve operaciones matemáticas (+ - * / % ^ y paréntesis). Úsala SIEMPRE que haya cuentas; los LLM se equivocan sumando.",
  ejemploEntrada: "(12 + 8) * 3",
  ejecutar: (entrada) => {
    const r = evaluar(entrada);
    return `${entrada.trim()} = ${Number.isInteger(r) ? r : r.toFixed(4).replace(/0+$/, "")}`;
  },
};
