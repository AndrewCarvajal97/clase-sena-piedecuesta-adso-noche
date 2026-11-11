# Generador del tutorial paso a paso

Programa que construye `../checkpoints/`, `../pasos/*.md`, `../index.html` y `../README.md`.

```bash
node paso-a-paso/_generador/build.mjs                # genera y VERIFICA todo (≈ 1 min)
node paso-a-paso/_generador/build.mjs --sin-comandos # genera sin ejecutar comandos (no captura salidas)
```

Requiere que exista `codigo/node_modules` (ejecuta `npm install` en `codigo/`) y Windows (usa cmd.exe y junctions).

| Archivo | Qué contiene |
|---|---|
| `pasos.mjs` | El TEXTO didáctico: problema, conceptos, «por qué» de cada archivo, preguntas y errores. Edita aquí para cambiar la explicación. |
| `variantes.mjs` | Cómo se ve cada archivo en cada paso. Deriva todo del proyecto final (`../../codigo`) y declara en qué paso aparece cada archivo. |
| `build.mjs` | Orquesta: checkpoints → comprobaciones → Markdown → HTML. |
| `visor.js` | JavaScript del visor (navegación, resaltado, copiar, progreso). |

## Si cambias el código del proyecto

1. Edita `codigo/` normalmente.
2. Si agregas un archivo nuevo: añádelo a `MANIFIESTO` en `variantes.mjs` (paso en que aparece) y descríbelo en `pasos.mjs`.
3. Si agregas una prueba a `verificar.ts`: asígnale su paso en `PRUEBA_DESDE`.
4. Ejecuta `build.mjs`. Si algo no cuadra, falla con un mensaje claro (el paso 12 debe ser idéntico al proyecto final).
