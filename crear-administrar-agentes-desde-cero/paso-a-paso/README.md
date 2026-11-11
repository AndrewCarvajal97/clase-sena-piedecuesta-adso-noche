# Crear agentes de IA desde cero, paso a paso

De un script vacío a un equipo de agentes: TypeScript + Node + Strategy (Gemini · Cohere · Groq).

Una guía para **programar en vivo** (o repasar) todo el proyecto del curso, desde un script vacío hasta un sistema multi-agente, entendiendo **por qué existe cada archivo y qué problema resuelve**.

👉 **Abre [`index.html`](index.html)** en el navegador: es el visor interactivo (menú de pasos, botones de copiar, diferencias resaltadas). Los mismos pasos están en Markdown dentro de [`pasos/`](pasos/).

## Cómo usarlo

- **Modo A · Programar en vivo (recomendado).** Crea la carpeta del proyecto y avanza paso a paso: lee la sección «Qué problema resuelve», escribe los archivos de «Qué crear» (puedes copiarlos con el botón) y ejecuta los comandos. Compara tu salida con «Debes ver».
- **Modo B · Checkpoints (para no quedarte atrás).** La carpeta checkpoints/paso-NN contiene el proyecto COMPLETO tal como queda al terminar cada paso. Si un aprendiz se pierde, copia el checkpoint, ejecuta npm install y continúa desde ahí.
- **Modo C · Solo lectura.** Cada paso explica el porqué de cada archivo con las líneas importantes señaladas. Sirve para repasar o para preparar tu clase.

## Principios de esta guía

- **Un paso = una capacidad nueva.** Cada paso agrega UNA idea y termina con algo que se ejecuta y se ve funcionando.
- **Primero el problema, luego el código.** Antes de escribir nada se explica qué duele sin esa pieza. Así el código se entiende como solución, no como magia.
- **Siempre sin claves.** Todo funciona con LLM_PROVIDER=mock (sin internet ni gastar cuota). Los proveedores reales se conectan en el paso 3 y no cambian ni una línea de los agentes.
- **Sin frameworks.** Solo TypeScript, Node y fetch. Así se ve qué hace realmente un agente por dentro.
- **Cada paso está verificado.** Un generador construye cada checkpoint, comprueba que compile con tsc y ejecuta los comandos para capturar la salida real que ves en cada paso.

## Mapa de pasos (≈ 4 h 20 min programando en vivo)

| Paso | Qué construimos | Nivel | Tiempo |
|---:|---|---|---:|
| 0 | [Preparar el proyecto](pasos/00-preparar-proyecto.md) | Preparación | 10 min |
| 1 | [El contrato LLMProvider y un LLM de mentira](pasos/01-contrato-llmprovider.md) | Nivel 0 · parte 1 | 15 min |
| 2 | [Configuración, fábrica, medidor y el Nivel 0](pasos/02-nivel0-config-fabrica-medidor.md) | Nivel 0 · parte 2 | 20 min |
| 3 | [Proveedores reales: Gemini, Cohere y Groq](pasos/03-proveedores-reales.md) | Infraestructura | 20 min |
| 4 | [Resiliencia: Fallback y comparar proveedores](pasos/04-fallback-y-comparar.md) | Infraestructura | 15 min |
| 5 | [Chatbot con rol y memoria](pasos/05-nivel1-chatbot-memoria.md) | Nivel 1 | 20 min |
| 6 | [Herramientas: las «manos» del agente](pasos/06-herramientas.md) | Nivel 2 · parte 1 | 20 min |
| 7 | [El protocolo JSON y el ToolAgent](pasos/07-protocolo-json-toolagent.md) | Nivel 2 · parte 2 | 25 min |
| 8 | [ReAct: pensar → actuar → observar](pasos/08-nivel3-react.md) | Nivel 3 | 25 min |
| 9 | [Skills: conocimiento experto bajo demanda](pasos/09-nivel3b-skills.md) | Nivel 3b | 20 min |
| 10 | [Plan-and-Execute: planificar antes de actuar](pasos/10-nivel4-planificador.md) | Nivel 4 | 20 min |
| 11 | [Multi-agente: orquestador y especialistas](pasos/11-nivel5-multiagente.md) | Nivel 5 | 25 min |
| 12 | [Retos: extender sin tocar los agentes](pasos/12-retos-extender.md) | Retos | 25 min |

## Estructura final y por qué existe cada parte

| Carpeta / archivo | Qué es | Por qué existe | Paso |
|---|---|---|---:|
| `agentes-desde-cero/` | Raíz del proyecto | Todo lo que se instala y ejecuta vive aquí. | 0 |
| `package.json · tsconfig.json` | Identidad del proyecto y reglas de TypeScript | Hacen que todos tengan el mismo entorno y que los errores aparezcan al escribir. | 0 |
| `.env.example → .env` | Configuración y secretos | Las claves y el proveedor elegido no se escriben en el código ni se suben a GitHub. | 2 |
| `skills/` | Conocimiento experto en Markdown (SKILL.md) | Enseña al agente CÓMO hacer tareas sin recompilar código. | 9 |
| `src/llm/` | Todo lo que habla con modelos de lenguaje | Aísla a los agentes de los proveedores: aquí vive el patrón Strategy. | 1 |
| `src/llm/types.ts` | El contrato LLMProvider | La interfaz común que todo proveedor cumple. | 1 |
| `src/llm/providers/` | Una clase por proveedor | Gemini, Cohere, Groq, Mock y Fallback: intercambiables. | 1 |
| `src/llm/factory.ts · medido.ts` | Fábrica y medidor | Elegir proveedor desde .env y controlar llamadas/tokens (Decorator). | 2 |
| `src/tools/` | Las «manos» del agente | Funciones normales con una descripción que el LLM lee. | 6 |
| `src/agentes/` | Los «cerebros» (niveles 1 al 5) | ChatAgent, ToolAgent, ReActAgent, Planificador y Orquestador, más memoria, protocolo y eventos. | 5 |
| `src/skills/` | Cargador de skills | Lee skills/*/SKILL.md y las entrega por demanda. | 9 |
| `src/util/` | Utilidades pequeñas | HTTP con reintentos, extracción de JSON y colores de consola. | 2 |
| `src/niveles/` | Los ejecutables de la clase | Un script por nivel: lo que se corre y se muestra a los aprendices. | 2 |
| `src/soluciones/` | Retos resueltos | Muestran cómo extender el sistema sin tocar los agentes. | 12 |
| `src/bootstrap.ts · config.ts` | Arranque compartido | Crear el LLM, cargar .env y manejar errores igual en todos los scripts. | 2 |
| `src/verificar.ts` | Pruebas sin internet | Red de seguridad que usa el Mock: crece con cada paso. | 2 |

```
agentes-desde-cero/
├── skills/
│   ├── reporte-clima/
│   │   └── SKILL.md
│   └── resumen-ejecutivo/
│       └── SKILL.md
├── src/
│   ├── agentes/
│   │   ├── ChatAgent.ts
│   │   ├── eventos.ts
│   │   ├── memoria.ts
│   │   ├── Orquestador.ts
│   │   ├── PlanificadorAgent.ts
│   │   ├── protocolo.ts
│   │   ├── ReActAgent.ts
│   │   └── ToolAgent.ts
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── cohere.ts
│   │   │   ├── fallback.ts
│   │   │   ├── gemini.ts
│   │   │   ├── groq.ts
│   │   │   └── mock.ts
│   │   ├── factory.ts
│   │   ├── medido.ts
│   │   └── types.ts
│   ├── niveles/
│   │   ├── comparar-proveedores.ts
│   │   ├── nivel0-llamada.ts
│   │   ├── nivel1-chatbot.ts
│   │   ├── nivel2-herramientas.ts
│   │   ├── nivel3-react.ts
│   │   ├── nivel3b-skills.ts
│   │   ├── nivel4-planificador.ts
│   │   └── nivel5-multiagente.ts
│   ├── skills/
│   │   └── biblioteca.ts
│   ├── soluciones/
│   │   ├── climaReal.ts
│   │   ├── convertirMoneda.ts
│   │   ├── ollama.ts
│   │   └── probar-soluciones.ts
│   ├── tools/
│   │   ├── basicas.ts
│   │   ├── calculadora.ts
│   │   └── herramienta.ts
│   ├── util/
│   │   ├── consola.ts
│   │   ├── http.ts
│   │   └── json.ts
│   ├── bootstrap.ts
│   ├── config.ts
│   └── verificar.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Contenido de esta carpeta

```
paso-a-paso/
├── index.html          ← visor interactivo (¡empieza aquí!)
├── pasos/              ← un archivo Markdown por paso
├── checkpoints/        ← el proyecto completo al terminar cada paso (paso-00 … paso-12)
└── _generador/         ← programa que construye y VERIFICA todo lo anterior
```

## Cómo se garantiza que no está desactualizado

El código mostrado en cada paso **no se escribe a mano**: se deriva del proyecto real en [`../codigo`](../codigo). El generador comprueba que:

1. el **paso 12 sea idéntico** al proyecto final, archivo por archivo;
2. **cada paso compile** con `tsc` (13 checkpoints);
3. **cada comando de cada paso se ejecute** y la salida que ves en «Debes ver» sea la real.

Si cambias el código del proyecto, regenera con:

```bash
node paso-a-paso/_generador/build.mjs
```
