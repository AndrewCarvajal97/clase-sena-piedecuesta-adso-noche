import { existsSync } from "node:fs";

/** Carga el archivo .env (Node 20.12+ lo trae incorporado, sin instalar "dotenv"). */
if (existsSync(".env")) process.loadEnvFile(".env");

export const env = (nombre: string): string | undefined => process.env[nombre]?.trim() || undefined;
