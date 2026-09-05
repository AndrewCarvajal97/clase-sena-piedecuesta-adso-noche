# Curso: Inteligencia Artificial, Modelos de Aprendizaje y Agentes con LLMs

**SENA — Piedecuesta (Sábados)**
Por **Pablo Andrés Carvajal** — Desarrollador Full Stack · [pablocarvajal.dev](https://pablocarvajal.dev)

---

## 🎯 De qué trata el curso

Un recorrido práctico y a profundidad por la Inteligencia Artificial moderna: desde
qué es un modelo de aprendizaje y sus tipos (supervisado, no supervisado, por
refuerzo…), pasando por **cómo funciona realmente un LLM** por dentro (tokenización,
chunking, vectorización, embeddings, atención), hasta **construir tus propios agentes
de IA** usando APIs gratuitas como **Cohere** y **Gemini**.

Cada clase mezcla teoría con práctica en el computador.

## 🗓️ Estructura del curso

Son **4 clases de 4 horas (8:00 am – 12:00 m)**, más una **Clase 0 de preparación**
(sesión rápida, sin horario) para dejar el entorno listo.

| Clase | Tema | Duración |
|-------|------|----------|
| **Clase 0** | Preparación: cuentas, herramientas y OpenCode | Rápida (preparación) |
| **Clase 1** | Fundamentos de IA y tipos de aprendizaje (a profundidad) | 4 h (8am–12m) |
| **Clase 2** | Cómo funciona un LLM: chunking, vectorización, lenguaje natural | 4 h (8am–12m) |
| **Clase 3** | Cómo crear modelos de datos de aprendizaje | 4 h (8am–12m) |
| **Clase 4** | Crear agentes de IA con APIs gratuitas (Cohere y Gemini) | 4 h (8am–12m) |
| **Clase alternativa** | App React con un agente LLM y base de datos vectorial (RAG) | 4 h (avanzada, opcional) |

> La **clase alternativa** ([`clase-alternativa-react-agente/`](clase-alternativa-react-agente/))
> es un proyecto avanzado y opcional: construir una app en **React** con un **agente LLM**
> conectado a una **base de datos vectorial** (React + Express + Cohere + Supabase/pgvector + Gemini).

## 📁 Cómo está organizado

Cada clase es una **carpeta autocontenida** con todo lo necesario:

```
grupo-sena-piedecuesta-sabados/
├── README.md
├── requirements.txt          ← dependencias de Python
├── .env.example              ← plantilla para tus claves de API
├── recursos/                 ← estilos compartidos + Laboratorio interactivo
│   └── demos-interactivos.html   ← hub de demos en vivo (ábrelo en el navegador)
│
├── clase-0/
│   ├── presentacion.html     ← para proyectar en clase
│   ├── guia-de-trabajo.pdf   ← guía del aprendiz (+ actividades de refuerzo)
│   └── codigo/               ← código de ejemplo
├── clase-1/ … clase-4/       ← misma estructura en cada una
└── clase-alternativa-react-agente/   ← proyecto opcional React + agente + BD vectorial
```

En cada carpeta encontrarás:

- **`presentacion.html`** — presentación de diapositivas para explicar el tema paso a
  paso. Se abre en cualquier navegador; se navega con las flechas **← →** (o la barra
  espaciadora) y con **F** se pone en pantalla completa.
- **`guia-de-trabajo.pdf`** — guía para que el aprendiz **siga la clase por su cuenta**,
  con la teoría explicada y **actividades de refuerzo** para practicar.
- **`codigo/`** — ejemplos de código listos para ejecutar (en las clases que lo requieren).

## 🔬 Laboratorio interactivo (demos en vivo)

Para hacer las clases dinámicas, el curso incluye un **hub de demos interactivas**:
[`recursos/demos-interactivos.html`](recursos/demos-interactivos.html). Ábrelo en el
navegador y proyéctalo en clase para **ver** cómo funciona la IA:

- Cómo un LLM predice el **siguiente token** de forma estadística (Transformer Explainer).
- Cómo aprende una **red neuronal** (TensorFlow Playground).
- Cómo se ven los **embeddings** en un mapa 3D (Embedding Projector).
- **Entrenar un modelo sin código** con la cámara (Teachable Machine), y más.

Cada clase enlaza sus demos correspondientes en la presentación y en la guía.

**Material de estudio en español** (también en el hub):
- [Elementos de la IA](https://course.elementsofai.com/es/) — curso gratuito de la Universidad de Helsinki (desde cero).
- [DotCSV](https://www.youtube.com/@DotCSV) — el canal de IA en español más reconocido (redes neuronales, LLMs).
- [Curso intensivo de ML de Google](https://developers.google.com/machine-learning/crash-course?hl=es) — en español.
- [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) — muestra cada palabra con su **% de probabilidad** y permite ajustar la **temperatura**.

## 🧰 Requisitos

- Computador con internet.
- Cuenta de Google (para Gemini / Google AI Studio), y correo para Cohere y GitHub.
- **No se necesita experiencia previa en IA.**

Todo el software y las APIs tienen **planes gratuitos**. No se requiere tarjeta de crédito.

## ⚙️ Preparación del entorno (una sola vez)

1. Instalar las dependencias de Python:

   ```bash
   pip install -r requirements.txt
   ```

2. Copiar `.env.example` como `.env` y pegar tus claves:

   ```env
   GEMINI_API_KEY=tu_clave
   COHERE_API_KEY=tu_clave
   ```

> ⚠️ El archivo `.env` guarda secretos y **no debe subirse a GitHub** (ya está en
> `.gitignore`).

Todo esto se explica paso a paso en la **Clase 0**.

## 🎓 Al terminar el curso, el aprendiz será capaz de

1. Explicar qué es la IA, el machine learning y el deep learning, y diferenciar los
   tipos de aprendizaje.
2. Describir cómo un LLM convierte texto en números y genera lenguaje natural.
3. Preparar un conjunto de datos y entrenar/evaluar un modelo de ML básico.
4. Construir un agente de IA funcional con memoria y herramientas usando APIs gratuitas.
5. Usar un asistente de código con IA (OpenCode) para acelerar su trabajo.

## 👩‍🏫 Nota para el instructor

- Los nombres de modelos (`gemini-1.5-flash`, `command-r`, `embed-multilingual-v3.0`) y
  los planes gratuitos pueden cambiar con el tiempo. Antes de dictar, conviene verificar
  los vigentes en la documentación oficial de Google AI Studio y Cohere.
- Las guías en PDF se generan a partir de los archivos `guia-de-trabajo.html` de cada
  clase (los HTML se conservan por si quieres editarlas y volver a exportarlas).
