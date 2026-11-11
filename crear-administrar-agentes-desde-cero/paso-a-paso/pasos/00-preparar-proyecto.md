# Paso 0 · Preparar el proyecto

> **Preparación** · ⏱ ~10 min · [← Índice](../README.md)

## 🎯 Qué construimos

Tener una carpeta con Node, TypeScript y tsx funcionando, y comprobarlo con un «Hola».

## ❓ Qué problema resuelve (por qué hacemos esto)

Antes de escribir un solo agente necesitas un entorno que sea IGUAL para todos los aprendices y que te avise de los errores mientras escribes (no cuando ya está en producción). Sin esto, el 30 % de la clase se pierde en «a mí no me corre».

## 🧠 Conceptos clave

- **Node.js + ESM:** Con "type": "module" usamos import/export (el estándar moderno) en vez de require().
- **TypeScript estricto:** JavaScript con tipos. Con strict activado, el editor marca errores como «esto puede ser undefined» antes de ejecutar.
- **tsx:** Ejecuta archivos .ts directamente, sin compilar a mano. Es lo que usan todos los npm run de este proyecto.

## 🗂️ Estructura de carpetas al terminar este paso

🆕 = archivo nuevo · ✏️ = archivo modificado en este paso

```
agentes-desde-cero/
├── src/
│   └── hola.ts   🆕
├── .gitignore   🆕
├── package.json   🆕
└── tsconfig.json   🆕
```

## 🛠️ Antes de empezar

```bash
mkdir agentes-desde-cero
cd agentes-desde-cero
mkdir src
node -v    # debe ser v20.12 o superior (recomendado 22)
```

## 👣 Qué crear

### 1. `package.json` — 🆕 nuevo

**Por qué:** La tarjeta de identidad del proyecto: nombre, scripts y dependencias. `npm install` lee las dependencias de aquí.

**Qué mirar:**

- "type": "module" → habilita import/export modernos (ESM).
- "engines" avisa si tu Node es demasiado viejo (más adelante usaremos process.loadEnvFile, de Node 20.12+).
- Solo 3 dependencias de desarrollo: typescript, tsx y @types/node. NO hay frameworks: construiremos todo desde cero.
- "typecheck": revisa tipos sin ejecutar. Cada paso agregará sus propios scripts.

```json
{
  "name": "agentes-desde-cero",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Clase: crear y administrar agentes de IA desde cero con TypeScript, Node y patrón Strategy",
  "engines": { "node": ">=20.12" },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

### 2. `tsconfig.json` — 🆕 nuevo

**Por qué:** Le dice a TypeScript qué tan estricto ser. Queremos detectar errores al escribir, no con un cliente enojado.

**Qué mirar:**

- "strict": true → activa todas las comprobaciones fuertes de tipos.
- "noUncheckedIndexedAccess": true → obliga a tratar `lista[0]` como posiblemente undefined (evita muchos bugs).
- "moduleResolution": "Bundler" → permite escribir imports con extensión .js aunque el archivo sea .ts.
- "noEmit": true → tsc solo revisa; quien ejecuta es tsx.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

### 3. `.gitignore` — 🆕 nuevo

**Por qué:** Evita subir al repositorio lo que NUNCA debe subirse: tus claves y las dependencias pesadas.

**Qué mirar:**

- `.env` contendrá tus API keys: jamás debe llegar a GitHub.
- `node_modules/` se regenera con npm install.

```
node_modules/
.env
```

### 4. `src/hola.ts` — 🆕 nuevo

**Por qué:** Prueba de humo: si esto corre, Node + TypeScript + tsx funcionan y podemos construir encima. Lo borraremos en el paso 1.

**Qué mirar:**

- `const nombre: string` ya es TypeScript: si le asignas un número, el editor te marca error.

```ts
const nombre: string = "SENA";
console.log(`Hola desde TypeScript, ${nombre}! Node ${process.version}`);
```

## ▶️ Ejecutar y comprobar

**1.** Descarga TypeScript, tsx y @types/node dentro de node_modules/.

```bash
npm install
```

**2.** No imprime nada cuando todo está bien (silencio = éxito).

```bash
npm run typecheck
```

**3.** Tu versión de Node puede variar.

```bash
npx tsx src/hola.ts
```

**Debes ver (los valores pueden variar):**

```
Hola desde TypeScript, SENA! Node v22.14.0
```

## ✅ Checkpoint

El comando `npx tsx src/hola.ts` imprime el saludo y `npm run typecheck` no muestra errores.

Si te quedaste atrás, copia `checkpoints/paso-00/`, ejecuta `npm install` y continúa.

## 💬 Preguntas para los aprendices

- ¿Por qué usamos tsx en vez de compilar con tsc y ejecutar el JavaScript resultante?
- ¿Qué ventaja tiene que `strict` esté activado desde el primer día?

## 🚑 Errores comunes

| Síntoma | Causa |
|---|---|
| 'tsx' no se reconoce como un comando | No ejecutaste npm install, o estás en otra carpeta. Verifica con `ls` que ves package.json. |
| Cannot use import statement outside a module | Falta "type": "module" en package.json. |

## ➡️ Siguiente paso

En el paso 1 definimos el contrato que hará que nuestros agentes funcionen con CUALQUIER modelo de lenguaje.

---
[Paso 1 →](01-contrato-llmprovider.md)
