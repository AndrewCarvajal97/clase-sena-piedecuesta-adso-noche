"""Genera tareas/tarea-01_clasificacion_vinos.ipynb (tarea para el aprendiz)."""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 📝 Tarea 1 — Clasifica vinos con Machine Learning

Curso de Modelos de Aprendizaje · por **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)

---

En esta tarea vas a aplicar **tú solo/a** lo que aprendimos en las Clases 0 y 1, pero con un
**dataset nuevo**: el dataset **Wine (vinos)**, que trae medidas químicas de 178 vinos de
**3 tipos distintos**. Tu misión: entrenar un modelo que **adivine el tipo de vino** a partir de sus medidas.

### 🎯 Qué debes lograr
1. Cargar y explorar los datos.
2. Separar `X` e `y`, y dividir en entrenamiento y prueba.
3. Entrenar un modelo de clasificación.
4. Evaluarlo (exactitud + matriz de confusión).
5. Usarlo para predecir un vino nuevo.
6. Responder unas preguntas de reflexión.

### 📌 Cómo trabajar
- Completa las celdas que dicen **`# TODO`**. Al lado tienes **pistas** y el nombre exacto de las funciones.
- Guíate por el **Notebook 01** (`01_supervisado_basico.ipynb`): esta tarea es casi lo mismo, ¡pero con vinos!
- Ejecuta cada celda con **Shift + Enter**, en orden.

> ✅ **Entrega:** ver las instrucciones al final del notebook.
""")

nb.md(r"""
## Parte 0 — Punto de partida (ya está resuelto)

Ejecuta esta celda tal cual. Carga el dataset y lo deja en una tabla llamada `df`.
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_theme()

from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report, ConfusionMatrixDisplay

vinos = load_wine(as_frame=True)
df = vinos.frame                       # tabla con las 13 medidas + la columna objetivo
df["tipo"] = vinos.target_names[vinos.target]   # nombre legible del tipo de vino

print("Tipos de vino:", list(vinos.target_names))
df.head()
""")

nb.md(r"""
## Parte 1 — Explora los datos  🔍

Antes de modelar, SIEMPRE miramos los datos (como en la Clase 0).
""")

nb.md(r"""
**Tarea 1.1** — Muestra el tamaño de la tabla y cuántos vinos hay de cada tipo.
""")

nb.code(r"""
# TODO: imprime la forma de la tabla (filas, columnas)
# Pista: df.shape

# TODO: cuenta cuántos vinos hay de cada tipo
# Pista: df["tipo"].value_counts()

""")

nb.md(r"""
**Tarea 1.2** — Muestra las estadísticas de las columnas numéricas.
""")

nb.code(r"""
# TODO: muestra las estadísticas (media, min, max, etc.)
# Pista: df.describe()

""")

nb.md(r"""
## Parte 2 — Prepara los datos  ✂️

Necesitamos separar las **entradas (X)** de la **respuesta (y)** y luego dividir en
**entrenamiento** (para aprender) y **prueba** (para examinar).
""")

nb.code(r"""
# X = las 13 medidas químicas ; y = el tipo de vino (0, 1, 2)
X = vinos.data
y = vinos.target

# TODO: divide en train (80%) y test (20%) usando train_test_split
# Pista (igual que en el Notebook 01):
# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)


# TODO: imprime cuántos ejemplos quedaron en train y en test
# Pista: len(X_train) y len(X_test)

""")

nb.md(r"""
## Parte 3 — Entrena tu modelo  🧠

Elige **uno** de los dos modelos que vimos (kNN o árbol de decisión) y entrénalo.
""")

nb.code(r"""
# OPCIÓN A: k vecinos más cercanos
# from sklearn.neighbors import KNeighborsClassifier
# modelo = KNeighborsClassifier(n_neighbors=5)

# OPCIÓN B: árbol de decisión
# from sklearn.tree import DecisionTreeClassifier
# modelo = DecisionTreeClassifier(max_depth=3, random_state=42)

# TODO: 1) importa y crea el modelo que elijas (descomenta una opción de arriba)
# TODO: 2) entrénalo con los datos de entrenamiento
# Pista: modelo.fit(X_train, y_train)

""")

nb.md(r"""
## Parte 4 — Evalúa el modelo  📊

¿Qué tan bien predice con datos que **no** vio (el test)?
""")

nb.code(r"""
# TODO: 1) usa el modelo para predecir sobre X_test
# Pista: pred = modelo.predict(X_test)

# TODO: 2) calcula e imprime la exactitud
# Pista: accuracy_score(y_test, pred)

""")

nb.md(r"""
**Tarea 4.1** — Dibuja la **matriz de confusión** para ver en qué se confunde el modelo.
""")

nb.code(r"""
# TODO: crea la matriz de confusión y grafícala
# Pistas:
# cm = confusion_matrix(y_test, pred)
# ConfusionMatrixDisplay(cm, display_labels=vinos.target_names).plot(cmap="Greens")
# plt.show()

# TODO (opcional): imprime el classification_report
# Pista: print(classification_report(y_test, pred, target_names=vinos.target_names))

""")

nb.md(r"""
## Parte 5 — Predice un vino nuevo  🍷

Usa tu modelo entrenado para clasificar un vino con medidas inventadas.
""")

nb.code(r"""
# Tomamos como ejemplo las medidas del primer vino de la tabla (puedes cambiarlas)
vino_nuevo = X.iloc[[0]]     # una fila con las 13 medidas

# TODO: predice el tipo de este vino y muestra su NOMBRE
# Pistas:
# p = modelo.predict(vino_nuevo)[0]
# print("Tipo predicho:", vinos.target_names[p])

""")

nb.md(r"""
## Parte 6 — Reto (opcional, suma puntos)  🏆

Entrena **el otro** modelo (el que no elegiste en la Parte 3) y compara su exactitud.
¿Cuál funcionó mejor con los vinos?
""")

nb.code(r"""
# TODO: entrena el otro modelo, evalúalo y compara la exactitud con el anterior

""")

nb.md(r"""
## Parte 7 — Preguntas de reflexión  ✍️

**Haz doble clic en esta celda y escribe tus respuestas** debajo de cada pregunta:

1. ¿Qué modelo elegiste y qué exactitud obtuviste?
   👉 *Tu respuesta:*

2. Según la matriz de confusión, ¿el modelo confundió algún tipo de vino con otro? ¿Cuál?
   👉 *Tu respuesta:*

3. ¿Por qué dividimos los datos en entrenamiento y prueba? (explícalo con tus palabras)
   👉 *Tu respuesta:*

4. Si tuvieras el doble de vinos en el dataset, ¿crees que el modelo mejoraría? ¿Por qué?
   👉 *Tu respuesta:*
""")

nb.md(r"""
---
## 📋 Rúbrica de evaluación (100 puntos)

| Parte | Qué se evalúa | Puntos |
|------|----------------|:---:|
| 1 | Exploración de datos (forma, conteo, describe) | 15 |
| 2 | Separación X/y y división train/test correcta | 20 |
| 3 | Modelo creado y entrenado (`fit`) | 20 |
| 4 | Evaluación: exactitud + matriz de confusión | 25 |
| 5 | Predicción de un vino nuevo | 10 |
| 7 | Respuestas de reflexión | 10 |
| 6 | Reto (opcional) | +5 extra |

## 📤 Cómo entregar

1. En Colab: **Archivo → Guardar una copia en Drive**.
2. Renombra el archivo con **tu nombre** (ej.: `Tarea1_Maria_Gomez.ipynb`).
3. Descárgalo con **Archivo → Descargar → .ipynb** (o comparte el enlace de Colab, según indique el instructor).
4. Súbelo a la plataforma del curso antes de la fecha límite.

> 💡 **Consejo:** antes de entregar, usa **Entorno de ejecución → Reiniciar y ejecutar todo**
> para confirmar que todo el notebook corre sin errores de principio a fin.

¡Éxitos! 🍀
""")

nb.save("../tareas/tarea-01_clasificacion_vinos.ipynb")
