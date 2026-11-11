const c = (n: number) => (t: string) => `\x1b[${n}m${t}\x1b[0m`;
export const verde = c(32), amarillo = c(33), azul = c(36), rojo = c(31), gris = c(90), negrita = c(1);

export const titulo = (t: string) =>
  console.log(`\n${negrita(verde("═".repeat(60)))}\n${negrita(t)}\n${negrita(verde("═".repeat(60)))}`);
