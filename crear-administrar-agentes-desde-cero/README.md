# Crear y administrar agentes de IA desde cero

**Clase única de 4 h 40 min** (con 2 descansos) para personas técnicas **sin experiencia previa en agentes**.
Stack: **TypeScript + Node.js**, LLM **Gemini · Cohere · Groq**, patrón **Strategy**.

## 🎯 Qué se aprende

1. Vocabulario esencial: LLM, token, prompt, herramienta, agente, ReAct, RAG, guardrail…
2. **6 niveles de agentes**, del más simple al más avanzado:

| Nivel | Qué es | Archivo |
|------:|--------|---------|
| 0 | Llamada simple a un LLM | `niveles/nivel0-llamada.ts` |
| 1 | Chatbot con rol y memoria (Strategy de memoria) | `niveles/nivel1-chatbot.ts` |
| 2 | Agente con una herramienta | `niveles/nivel2-herramientas.ts` |
| 3 | Agente **ReAct** (bucle pensar-actuar-observar) | `niveles/nivel3-react.ts` |
| 4 | **Planificador** (planear → ejecutar → sintetizar) | `niveles/nivel4-planificador.ts` |
| 5 | **Multi-agente** con orquestador y tablero de administración | `niveles/nivel5-multiagente.ts` |

3. **Patrón Strategy** aplicado dos veces: proveedores LLM (`llm/`) y memoria (`agentes/memoria.ts`),
   más **Fallback** (estrategia compuesta) y **Decorator** (`LLMMedido`) para métricas y presupuesto.
4. **Administrar** agentes: límites, trazas, seguridad, reintentos, fallback y pruebas.

## 📁 Contenido

```
crear-administrar-agentes-desde-cero/
├── presentacion.html              ← 51 diapositivas para proyectar
├── guia-de-trabajo.html           ← guion minuto a minuto + ejercicios + rúbrica (imprimible a PDF)
├── actividades/
│   └── laboratorio-agentes.html   ← 6 actividades interactivas (funciona sin internet)
├── assets/                        ← estilos y motor de diapositivas
└── codigo/                        ← proyecto Node + TypeScript
    ├── src/llm/                   ← Strategy: Gemini, Cohere, Groq, Mock, Fallback, Medido, factory
    ├── src/tools/                 ← calculadora segura, clima, hora, conocimiento
    ├── src/agentes/               ← ChatAgent, ToolAgent, ReActAgent, Planificador, Orquestador
    ├── src/niveles/               ← los scripts que se ejecutan en clase
    └── src/soluciones/            ← soluciones de los retos (no compartir antes)
```

## ▶️ Cómo ejecutarlo

Requiere **Node.js 20.12+**.

```bash
cd codigo
npm install
copy .env.example .env     # (Mac/Linux: cp .env.example .env)
npm test                   # 15 pruebas offline → "¡Entorno listo!"
npm run nivel3
```

Con `LLM_PROVIDER=mock` (valor por defecto del ejemplo) todo funciona **sin internet ni claves**.
Para usar un LLM real, pon su clave en `.env` y cambia `LLM_PROVIDER` (`groq`, `gemini`, `cohere` o `fallback`).

| Comando | Qué hace |
|---------|----------|
| `npm run nivel0` … `nivel5` | Cada nivel de agente (admiten `-- "tu pregunta"`) |
| `npm run nivel1 -- ventana` | Chatbot con memoria de ventana (`completa`, `ventana`, `resumen`) |
| `npm run comparar` | Misma pregunta con cada proveedor + demo de fallback |
| `npm test` | Pruebas offline de todo el proyecto |
| `npm run typecheck` | Verifica tipos con `tsc` |
| `npm run soluciones` | Prueba las soluciones de los retos |

## 🔑 Claves gratuitas (opcionales)

- Gemini → https://aistudio.google.com/apikey
- Cohere → https://dashboard.cohere.com/api-keys
- Groq → https://console.groq.com/keys

> Los modelos y las cuotas gratuitas cambian con el tiempo. Puedes sobrescribir el modelo de cada proveedor
> con `GEMINI_MODEL`, `COHERE_MODEL` y `GROQ_MODEL` en `.env`. **Nunca subas tu `.env` a GitHub.**

## 🧪 Nota técnica de diseño

Las herramientas se invocan con un **protocolo JSON propio** (`agentes/protocolo.ts`) en vez del *function calling*
nativo de cada proveedor. Así el mismo agente funciona igual con Gemini, Cohere y Groq, y se entiende cada paso
"desde cero". Extender `LLMProvider` para soportar function calling nativo es un excelente siguiente paso.
