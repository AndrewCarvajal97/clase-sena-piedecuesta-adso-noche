"""Genera 01_supervisado_basico.ipynb"""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 🎯 Notebook 1 — Aprendizaje supervisado (básico)

Curso práctico de Modelos de Aprendizaje · por **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)

---

El aprendizaje **supervisado** usa datos **con la respuesta correcta** (etiqueta). Dos tareas:
- **Regresión** → predecir un **número** (precio, propina, temperatura).
- **Clasificación** → predecir una **categoría** (spam/no spam, especie de flor).

En este notebook haremos **las dos**, paso a paso, y aprenderemos a **medir** si el modelo es bueno.
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_theme()
""")

nb.md(r"""
## Parte A — Regresión: predecir un número

Usaremos el dataset **tips** (propinas de un restaurante). Queremos predecir la **propina**
(`tip`) a partir del **total de la cuenta** (`total_bill`).
""")

nb.code(r"""
tips = sns.load_dataset("tips")   # se descarga automáticamente (Colab tiene internet)
tips.head()
""")

nb.code(r"""
plt.figure(figsize=(7, 5))
sns.scatterplot(data=tips, x="total_bill", y="tip")
plt.title("¿La propina crece con el total de la cuenta?")
plt.show()
""")

nb.md(r"""
Se ve una tendencia: **más cuenta → más propina**. Un modelo de **regresión lineal**
aprende la mejor "línea" que describe esa relación.

### Paso 1 — Separar X (entrada) e y (lo que queremos predecir)
""")

nb.code(r"""
X = tips[["total_bill"]]   # features (entra como tabla, por eso los dobles corchetes)
y = tips["tip"]            # objetivo (lo que predecimos)

print("X:", X.shape, " | y:", y.shape)
""")

nb.md(r"""
### Paso 2 — Dividir en entrenamiento y prueba

Nunca evaluamos con los mismos datos con los que el modelo aprendió. Reservamos un 20% para el "examen".
""")

nb.code(r"""
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print("Entrenamiento:", len(X_train), " | Prueba:", len(X_test))
""")

nb.md(r"""### Paso 3 — Entrenar el modelo""")

nb.code(r"""
from sklearn.linear_model import LinearRegression

modelo = LinearRegression()
modelo.fit(X_train, y_train)   # <- aquí APRENDE la línea

print(f"Fórmula aprendida:  propina = {modelo.coef_[0]:.3f} * total + {modelo.intercept_:.3f}")
""")

nb.md(r"""### Paso 4 — Evaluar: ¿qué tan bien predice?

Para regresión usamos:
- **MAE** (error absoluto medio): en promedio, ¿por cuántos dólares nos equivocamos?
- **R²**: qué tan bien explica el modelo los datos (1 = perfecto, 0 = malo).
""")

nb.code(r"""
from sklearn.metrics import mean_absolute_error, r2_score

pred = modelo.predict(X_test)
print(f"MAE: {mean_absolute_error(y_test, pred):.2f} dólares")
print(f"R² : {r2_score(y_test, pred):.2f}")
""")

nb.code(r"""
# Dibujamos la línea aprendida sobre los datos
plt.figure(figsize=(7, 5))
sns.scatterplot(data=tips, x="total_bill", y="tip", alpha=0.5, label="datos")
x_linea = np.linspace(tips["total_bill"].min(), tips["total_bill"].max(), 100).reshape(-1, 1)
plt.plot(x_linea, modelo.predict(x_linea), color="red", linewidth=2, label="modelo")
plt.legend(); plt.title("Regresión lineal: la línea aprendida")
plt.show()
""")

nb.code(r"""
# Usar el modelo: ¿cuánta propina para una cuenta de $50?
cuenta = pd.DataFrame({"total_bill": [50]})
print(f"Propina estimada para $50: {modelo.predict(cuenta)[0]:.2f} dólares")
""")

nb.md(r"""
## Parte B — Clasificación: predecir una categoría

Volvemos a **Iris** para predecir la **especie** de una flor a partir de sus medidas.
""")

nb.code(r"""
from sklearn.datasets import load_iris

iris = load_iris(as_frame=True)
X = iris.data                 # 4 medidas
y = iris.target               # 0,1,2 = especie
nombres = iris.target_names

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print("Entrenamiento:", len(X_train), " | Prueba:", len(X_test))
""")

nb.md(r"""
### Modelo 1 — k vecinos más cercanos (kNN)

Idea sencilla: una flor nueva se clasifica **mirando a las flores más parecidas** (sus "vecinas").
""")

nb.code(r"""
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(X_train, y_train)

pred = knn.predict(X_test)
print(f"Exactitud (kNN): {accuracy_score(y_test, pred):.2%}")
""")

nb.md(r"""
### Modelo 2 — Árbol de decisión

Aprende **reglas** tipo "si el pétalo mide más de X → especie Y". Es fácil de interpretar.
""")

nb.code(r"""
from sklearn.tree import DecisionTreeClassifier

arbol = DecisionTreeClassifier(max_depth=3, random_state=42)
arbol.fit(X_train, y_train)

pred = arbol.predict(X_test)
print(f"Exactitud (árbol): {accuracy_score(y_test, pred):.2%}")
""")

nb.md(r"""
### Leer los errores: la matriz de confusión

Muestra en qué acierta y en qué se confunde el modelo.
""")

nb.code(r"""
from sklearn.metrics import confusion_matrix, classification_report, ConfusionMatrixDisplay

cm = confusion_matrix(y_test, pred)
ConfusionMatrixDisplay(cm, display_labels=nombres).plot(cmap="Greens")
plt.title("Matriz de confusión (árbol)")
plt.show()

print(classification_report(y_test, pred, target_names=nombres))
""")

nb.code(r"""
# Predecir una flor nueva
flor = pd.DataFrame([[5.1, 3.5, 1.4, 0.2]], columns=iris.feature_names)
print("Especie predicha:", nombres[arbol.predict(flor)[0]])
""")

nb.md(r"""
## Parte C — Overfitting: cuando el modelo "memoriza"

Un modelo demasiado complejo aprende de memoria los datos de entrenamiento pero falla con datos nuevos.
Lo vemos variando la **profundidad** del árbol y comparando la exactitud en **train** vs **test**.
""")

nb.code(r"""
train_scores, test_scores = [], []
profundidades = range(1, 11)

for d in profundidades:
    m = DecisionTreeClassifier(max_depth=d, random_state=42).fit(X_train, y_train)
    train_scores.append(m.score(X_train, y_train))
    test_scores.append(m.score(X_test, y_test))

plt.figure(figsize=(7, 5))
plt.plot(profundidades, train_scores, "o-", label="Entrenamiento")
plt.plot(profundidades, test_scores, "o-", label="Prueba")
plt.xlabel("Profundidad del árbol"); plt.ylabel("Exactitud")
plt.title("Más complejo no siempre es mejor (overfitting)")
plt.legend(); plt.show()
""")

nb.md(r"""
> 👀 Al aumentar la profundidad, el train sube hacia 100% pero el **test se estanca o baja**:
> eso es **overfitting**. Se corrige con modelos más simples, más datos o regularización.

## 🏋️ Ejercicios

1. En la regresión de propinas, cambia el modelo por `KNeighborsRegressor` (de `sklearn.neighbors`)
   y compara el MAE con la regresión lineal.
2. En la clasificación, prueba `KNeighborsClassifier` con `n_neighbors = 1` y con `n_neighbors = 15`.
   ¿Cambia la exactitud?
3. Entrena un árbol con `max_depth=1`. ¿Por qué le va peor? Míralo en la matriz de confusión.
""")

nb.code(r"""
# ✍️ Tu código aquí

""")

nb.md(r"""
## ✅ Repaso

- **Regresión** predice números (MAE, R²); **clasificación** predice categorías (exactitud, matriz de confusión).
- Siempre dividimos en **train / test** para medir de forma honesta.
- Vimos **regresión lineal**, **kNN** y **árbol de decisión**, y el problema del **overfitting**.

**Siguiente:** `02_supervisado_intermedio_avanzado.ipynb` — pipelines, modelos más potentes,
validación cruzada y ajuste de hiperparámetros.
""")

nb.save("../notebooks/01_supervisado_basico.ipynb")
