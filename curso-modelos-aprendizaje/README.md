# 🤖 Curso práctico de Modelos de Aprendizaje

**Aprendizaje supervisado, no supervisado y mixto — de lo básico a lo avanzado, en Google Colab.**

Por **Pablo Andrés Carvajal** — Desarrollador Full Stack · [pablocarvajal.dev](https://pablocarvajal.dev)

---

## 🎯 De qué trata

Un curso **100% práctico** para aprender Machine Learning clásico **escribiendo código** en
Google Colab. Cada notebook mezcla explicación (celdas de texto) con código ejecutable, para
que el instructor pueda **ir explicando y los estudiantes siguiéndolo en vivo**.

No se necesita instalar nada: todo corre en **Google Colab** (en la nube, gratis).

## 🗂️ Contenido (orden recomendado)

| # | Notebook | Nivel | Qué se aprende |
|---|----------|-------|----------------|
| 0 | `00_introduccion_y_setup.ipynb` | Básico | Qué es ML, Colab, pandas, primera exploración |
| 1 | `01_supervisado_basico.ipynb` | Básico | Regresión y clasificación, train/test, métricas, overfitting |
| 2 | `02_supervisado_intermedio_avanzado.ipynb` | Intermedio-avanzado | Pipelines, ensembles, validación cruzada, ajuste de hiperparámetros, ROC-AUC |
| 3 | `03_no_supervisado.ipynb` | Intermedio-avanzado | K-Means, jerárquico, DBSCAN, PCA, t-SNE, anomalías |
| 4 | `04_mixto_semisupervisado.ipynb` | Avanzado | Self-training, label spreading, pseudo-etiquetas |
| 5 | `05_proyecto_final.ipynb` | Proyecto | Proyecto integrador guiado + rúbrica |

## ▶️ Cómo abrir un notebook en Google Colab

Tienes tres formas:

1. **Subir el archivo** (la más simple): entra a [colab.research.google.com](https://colab.research.google.com)
   → menú **Archivo → Subir notebook** → elige el `.ipynb` de la carpeta `notebooks/`.
2. **Desde Google Drive**: sube la carpeta `notebooks/` a tu Drive y abre cada `.ipynb` con
   Colab (clic derecho → Abrir con → Google Colaboratory).
3. **Desde GitHub**: si subes este repositorio a GitHub, abre
   `https://colab.research.google.com/github/<usuario>/<repo>/blob/main/curso-modelos-aprendizaje/notebooks/00_introduccion_y_setup.ipynb`

Una vez abierto, ejecuta cada celda con **Shift + Enter**, en orden de arriba hacia abajo.

## 🎨 Recursos visuales e interactivos

Para explicar de forma más visual y práctica, el curso incluye un **hub de recursos**:
[`recursos-visuales.html`](recursos-visuales.html) (ábrelo en el navegador; se filtra por tema).

Reúne herramientas para **ver y experimentar** cada tema:
- **[MLU-Explain](https://mlu-explain.github.io/)** (Amazon) — explicaciones interactivas de casi todos los temas.
- **[R2D3](https://r2d3.us/visual-intro-to-machine-learning-part-1/)** — cómo aprende una máquina (con versión en español).
- **[Visualizing K-Means](https://www.naftaliharris.com/blog/visualizing-k-means-clustering/)** y **[DBSCAN](https://www.naftaliharris.com/blog/visualizing-dbscan-clustering/)** — clustering paso a paso.
- **[PCA visual](https://setosa.io/ev/principal-component-analysis/)**, **[TensorFlow Playground](https://playground.tensorflow.org/)**, y más.

Las presentaciones de la Clase 0 y 1 ya enlazan los recursos correspondientes.

### 🧪 Ejercicio interactivo (para los aprendices)

[`ejercicios/laboratorio-regresion.html`](ejercicios/laboratorio-regresion.html) — un laboratorio guiado
de **1–2 horas** sobre regresión lineal: los aprendices ajustan la línea a mano, ven el **error en vivo**,
pulsan "calcular la mejor línea" y hacen predicciones. Genera todas las gráficas en el navegador, sin instalar nada.

### 📝 Tarea para entregar (Colab)

[`tareas/tarea-01_clasificacion_vinos.ipynb`](tareas/tarea-01_clasificacion_vinos.ipynb) — tarea que los
aprendices completan **por su cuenta** (celdas con `# TODO` y pistas): clasificar vinos aplicando lo de las
Clases 0 y 1 (train/test, entrenar, evaluar con matriz de confusión, predecir). Incluye **rúbrica (100 pts)**
e instrucciones de entrega. La solución fue verificada (árbol ≈ 94% de exactitud).

## 🧑‍🏫 Material para dictar las clases

- **`presentaciones/`** — diapositivas para proyectar (Clase 0 y Clase 1).
- **`guia-docente/`** — guía del docente en PDF (explica los conceptos, el código celda por celda y da el guion para enseñar).

## 🧰 Librerías

Todas vienen preinstaladas en Colab: **numpy, pandas, matplotlib, seaborn** y
**scikit-learn**. No necesitas `pip install`.

## 📁 Estructura

```
curso-modelos-aprendizaje/
├── README.md
├── recursos-visuales.html   ← hub de recursos visuales (ábrelo en el navegador)
├── presentaciones/          ← diapositivas Clase 0 y 1
├── guia-docente/            ← guía del docente (PDF)
├── notebooks/          ← los notebooks para abrir en Colab
│   ├── 00_introduccion_y_setup.ipynb
│   ├── 01_supervisado_basico.ipynb
│   ├── 02_supervisado_intermedio_avanzado.ipynb
│   ├── 03_no_supervisado.ipynb
│   ├── 04_mixto_semisupervisado.ipynb
│   └── 05_proyecto_final.ipynb
└── _build/             ← scripts que GENERAN los notebooks (no se usan en clase)
```

> La carpeta `_build/` contiene los generadores en Python (con `nbformat`). Sirve para
> **regenerar o editar** los notebooks de forma ordenada; los estudiantes solo usan `notebooks/`.

## 🎓 Al terminar, el estudiante será capaz de

1. Entrenar y **evaluar** modelos de regresión y clasificación.
2. Construir **pipelines** de preprocesamiento y **ajustar hiperparámetros**.
3. Aplicar **clustering** y **reducción de dimensionalidad** sin etiquetas.
4. Usar técnicas **semi-supervisadas** cuando hay pocas etiquetas.
5. Llevar un problema de datos de principio a fin en un **proyecto propio**.
