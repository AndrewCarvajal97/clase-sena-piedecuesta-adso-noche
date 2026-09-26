"""Genera 05_proyecto_final.ipynb"""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 🏆 Notebook 5 — Proyecto final (integrador)

Curso práctico de Modelos de Aprendizaje · por **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)

---

¡Felicidades por llegar hasta aquí! En este notebook vas a **juntar todo lo aprendido**
en el curso en un solo proyecto guiado:

- **Aprendizaje supervisado** → predecir la **especie** de un pingüino a partir de sus medidas.
- **Aprendizaje no supervisado** → explorar y agrupar los datos con **PCA** y **KMeans**.

### 🎯 Objetivos
1. Explorar un dataset real (**EDA**) y limpiar los datos faltantes.
2. **Preprocesar** correctamente: separar X/y, codificar categóricas y escalar numéricas con `Pipeline` + `ColumnTransformer`.
3. Entrenar y **evaluar** un modelo de clasificación (`classification_report`, matriz de confusión).
4. Aplicar **PCA** y **KMeans** para el análisis no supervisado y comparar con las especies reales.
5. Sacar **conclusiones** y autoevaluarte con la **rúbrica**.

### 📝 ¿Cómo trabajar este notebook?
Es un **proyecto guiado**. Verás dos tipos de celdas:
- Celdas **ya resueltas** de ejemplo → ejecútalas y estúdialas.
- Celdas marcadas con `# ✍️ COMPLETA:` → **tú debes escribir el código** siguiendo las pistas.

> 💡 Consejo: ejecuta las celdas **en orden** (arriba hacia abajo) con `Shift + Enter`.
""")

nb.md(r"""
## 0 — Preparación: librerías

Ejecuta esta celda primero. Importa todo lo que usaremos en el proyecto.
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_theme()

RANDOM_STATE = 42   # fijamos la semilla para obtener resultados reproducibles
""")

nb.md(r"""
## 1 — EDA: exploración de los datos

Usaremos el dataset **penguins** (pingüinos), que trae `seaborn`. Contiene medidas
corporales de 3 especies de pingüinos (Adelie, Chinstrap y Gentoo).

Nuestro objetivo supervisado será predecir la columna **`species`** (la especie).
""")

nb.code(r"""
penguins = sns.load_dataset("penguins")   # se descarga automáticamente (Colab tiene internet)
penguins.head()
""")

nb.md(r"""
### 1.1 — Información general

`.info()` nos dice cuántas filas hay, los tipos de dato y **cuántos valores faltan** por columna.
""")

nb.code(r"""
penguins.info()
""")

nb.md(r"""
### 1.2 — Contar valores faltantes

Antes de modelar hay que entender los **valores faltantes** (NaN). Cuéntalos por columna.
""")

nb.code(r"""
# ✍️ COMPLETA: muestra cuántos valores faltantes (NaN) hay en cada columna.
# Pista: usa el método .isna() seguido de .sum()
# penguins.____().____()
""")

nb.code(r"""
# ✅ Solución de ejemplo (descomenta si te atascas):
penguins.isna().sum()
""")

nb.md(r"""
### 1.3 — Eliminar los faltantes

Para este proyecto, la estrategia más sencilla es **eliminar** las filas que tengan algún
valor faltante con `dropna()`. Así trabajamos con datos completos.

> ℹ️ En proyectos reales a veces conviene **imputar** (rellenar) en lugar de eliminar,
> pero aquí `dropna()` es suficiente y simple.
""")

nb.code(r"""
print("Antes de dropna:", penguins.shape)
penguins = penguins.dropna().reset_index(drop=True)
print("Después de dropna:", penguins.shape)
penguins.head()
""")

nb.md(r"""
### 1.4 — ¿Cuántos hay de cada especie?

Ver el **balance de clases** ayuda a interpretar después las métricas.
""")

nb.code(r"""
print(penguins["species"].value_counts())

plt.figure(figsize=(6, 4))
sns.countplot(data=penguins, x="species")
plt.title("Cantidad de pingüinos por especie")
plt.show()
""")

nb.md(r"""
### 1.5 — Gráficas exploratorias

Un `pairplot` coloreado por especie muestra rápidamente qué medidas **separan** mejor a las especies.
""")

nb.code(r"""
sns.pairplot(penguins, hue="species")
plt.suptitle("Relaciones entre medidas, coloreadas por especie", y=1.02)
plt.show()
""")

nb.code(r"""
# ✍️ COMPLETA: haz un scatterplot que compare dos medidas y colorea por especie.
# Pista: usa sns.scatterplot(data=penguins, x=..., y=..., hue="species")
# Prueba con x="bill_length_mm" y y="flipper_length_mm"

# plt.figure(figsize=(7, 5))
# sns.scatterplot(data=penguins, x=____, y=____, hue="species")
# plt.title("Largo del pico vs. largo de la aleta")
# plt.show()
""")

nb.md(r"""
## 2 — Preprocesamiento

Ahora preparamos los datos para el modelo.

### 2.1 — Separar X (entradas) e y (objetivo)

- `y` = la especie (lo que queremos predecir).
- `X` = todas las demás columnas útiles (medidas + `sex` + `island`).
""")

nb.code(r"""
y = penguins["species"]
X = penguins.drop(columns=["species"])

print("X:", X.shape, " | y:", y.shape)
X.head()
""")

nb.md(r"""
### 2.2 — Identificar columnas numéricas y categóricas

Las trataremos distinto:
- **Numéricas** (medidas) → las vamos a **escalar** con `StandardScaler`.
- **Categóricas** (`sex`, `island`) → las vamos a **codificar** con `OneHotEncoder`.
""")

nb.code(r"""
num_cols = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
cat_cols = ["sex", "island"]

print("Numéricas :", num_cols)
print("Categóricas:", cat_cols)
""")

nb.md(r"""
### 2.3 — Construir el `ColumnTransformer`

El `ColumnTransformer` aplica **una transformación distinta a cada grupo de columnas**
dentro de un solo objeto. Así evitamos "fugas de datos" y todo queda ordenado.
""")

nb.code(r"""
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

preprocesador = ColumnTransformer(transformers=[
    ("num", StandardScaler(), num_cols),
    ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
])
preprocesador
""")

nb.md(r"""
### 2.4 — Dividir en entrenamiento y prueba

Reservamos un 20% para el "examen". Usamos `stratify=y` para conservar la proporción de especies.
""")

nb.code(r"""
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
print("Entrenamiento:", len(X_train), " | Prueba:", len(X_test))
""")

nb.md(r"""
## 3 — Modelo supervisado

Vamos a meter el **preprocesador** y el **modelo** en un único `Pipeline`. Así, al llamar
`fit`, primero se transforman los datos y luego se entrena el modelo, todo de una vez.

Usaremos un **`RandomForestClassifier`** (bosque aleatorio): combina muchos árboles y
suele dar muy buenos resultados.
""")

nb.code(r"""
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier

modelo = Pipeline(steps=[
    ("prep", preprocesador),
    ("clf", RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)),
])

modelo.fit(X_train, y_train)   # <- aquí preprocesa Y entrena
print("¡Modelo entrenado!")
""")

nb.md(r"""
### 3.1 — Evaluar el modelo

Calculamos las predicciones sobre el conjunto de **prueba** y las comparamos con la realidad.
""")

nb.code(r"""
from sklearn.metrics import accuracy_score, classification_report

y_pred = modelo.predict(X_test)

print(f"Exactitud (accuracy): {accuracy_score(y_test, y_pred):.2%}\n")
print(classification_report(y_test, y_pred))
""")

nb.md(r"""
### 3.2 — Matriz de confusión

Muestra en qué acierta y en qué se confunde el modelo, especie por especie.
""")

nb.code(r"""
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

etiquetas = modelo.classes_   # nombres de las especies en orden
cm = confusion_matrix(y_test, y_pred, labels=etiquetas)

ConfusionMatrixDisplay(cm, display_labels=etiquetas).plot(cmap="Greens")
plt.title("Matriz de confusión — Random Forest")
plt.show()
""")

nb.md(r"""
### 3.3 — ¿Qué medidas fueron más importantes?

El bosque aleatorio nos dice qué variables usó más para decidir. (Reto opcional resuelto.)
""")

nb.code(r"""
# Nombres de las columnas después del preprocesamiento
nombres_features = modelo.named_steps["prep"].get_feature_names_out()
importancias = modelo.named_steps["clf"].feature_importances_

imp = pd.Series(importancias, index=nombres_features).sort_values()

plt.figure(figsize=(7, 5))
imp.plot(kind="barh")
plt.title("Importancia de cada variable")
plt.xlabel("Importancia")
plt.tight_layout()
plt.show()
""")

nb.md(r"""
### 3.4 — Tu turno: predecir un pingüino nuevo

Usa el modelo entrenado para predecir la especie de un pingüino inventado.
""")

nb.code(r"""
# ✍️ COMPLETA: crea un DataFrame con los datos de un pingüino y predice su especie.
# Pista: el DataFrame debe tener las MISMAS columnas que X.
# Rellena los valores que faltan (____) con números y categorías razonables.

# nuevo = pd.DataFrame([{
#     "island": "Biscoe",
#     "bill_length_mm": ____,
#     "bill_depth_mm": ____,
#     "flipper_length_mm": ____,
#     "body_mass_g": ____,
#     "sex": "Male",
# }])
# print("Especie predicha:", modelo.predict(nuevo)[0])
""")

nb.code(r"""
# ✅ Solución de ejemplo (descomenta si te atascas):
nuevo = pd.DataFrame([{
    "island": "Biscoe",
    "bill_length_mm": 45.0,
    "bill_depth_mm": 15.0,
    "flipper_length_mm": 220.0,
    "body_mass_g": 5000.0,
    "sex": "Male",
}])
print("Especie predicha:", modelo.predict(nuevo)[0])
""")

nb.md(r"""
## 4 — Análisis no supervisado

Ahora **olvidamos las etiquetas** (las especies) y dejamos que el algoritmo encuentre
estructura por sí solo. Compararemos al final si los grupos que descubre coinciden con las
especies reales.

### 4.1 — PCA: reducir a 2 dimensiones para visualizar

Tenemos varias medidas numéricas. **PCA** las combina en solo 2 componentes para poder
dibujarlas en un plano, conservando la mayor variación posible.
""")

nb.code(r"""
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

# Solo usamos las columnas numéricas para el análisis no supervisado
X_num = penguins[num_cols]

# 1) escalamos
X_num_esc = StandardScaler().fit_transform(X_num)

# 2) reducimos a 2 componentes
pca = PCA(n_components=2, random_state=RANDOM_STATE)
X_pca = pca.fit_transform(X_num_esc)

print("Varianza explicada por cada componente:", pca.explained_variance_ratio_.round(3))
print("Varianza total conservada:", pca.explained_variance_ratio_.sum().round(3))
""")

nb.code(r"""
# Dibujamos las 2 componentes, coloreando con la especie REAL (solo para ver qué tan bien separa)
plt.figure(figsize=(7, 5))
sns.scatterplot(x=X_pca[:, 0], y=X_pca[:, 1], hue=penguins["species"])
plt.xlabel("Componente 1"); plt.ylabel("Componente 2")
plt.title("PCA de los pingüinos (color = especie real)")
plt.show()
""")

nb.md(r"""
### 4.2 — KMeans: agrupar sin mirar las etiquetas

Sabemos que hay **3 especies**, así que pediremos a KMeans que forme **3 grupos** (`n_clusters=3`).
KMeans **no conoce las especies**: agrupa solo por parecido en las medidas.
""")

nb.code(r"""
from sklearn.cluster import KMeans

kmeans = KMeans(n_clusters=3, random_state=RANDOM_STATE, n_init=10)
grupos = kmeans.fit_predict(X_num_esc)

plt.figure(figsize=(7, 5))
sns.scatterplot(x=X_pca[:, 0], y=X_pca[:, 1], hue=grupos, palette="Set2")
plt.xlabel("Componente 1"); plt.ylabel("Componente 2")
plt.title("Grupos encontrados por KMeans (sin usar las especies)")
plt.show()
""")

nb.md(r"""
### 4.3 — Comparar los grupos con las especies reales

Con una **tabla cruzada** (`crosstab`) vemos cuántos pingüinos de cada especie cayeron en
cada grupo. Si el agrupamiento es bueno, cada especie se concentrará en un grupo distinto.

> ⚠️ Los **números** de los grupos (0, 1, 2) no tienen por qué coincidir con el orden de las
> especies: lo importante es que cada especie quede **agrupada junta**.
""")

nb.code(r"""
comparacion = pd.crosstab(penguins["species"], grupos,
                          rownames=["Especie real"], colnames=["Grupo KMeans"])
comparacion
""")

nb.code(r"""
# ✍️ COMPLETA: reflexiona en código.
# Cambia n_clusters a 2 y luego a 4, vuelve a graficar y observa qué pasa.
# Pista: repite el KMeans con otro valor de n_clusters.

# km_prueba = KMeans(n_clusters=____, random_state=RANDOM_STATE, n_init=10)
# grupos_prueba = km_prueba.fit_predict(X_num_esc)
# sns.scatterplot(x=X_pca[:, 0], y=X_pca[:, 1], hue=grupos_prueba, palette="Set2")
# plt.title("Prueba con otro número de grupos")
# plt.show()
""")

nb.md(r"""
## 5 — Conclusiones

Responde estas preguntas en la siguiente celda de texto (haz doble clic para editarla):

1. **Supervisado:** ¿qué exactitud logró tu modelo? ¿En qué especie se confundió más
   (mira la matriz de confusión)?
2. **Importancia:** ¿cuáles fueron las 2 variables más importantes para predecir la especie?
3. **No supervisado:** ¿los grupos de KMeans se parecieron a las especies reales? ¿Cuál
   especie fue la más fácil de separar?
4. **Comparación:** ¿qué diferencia hay entre lo que hace el modelo supervisado y lo que
   hace KMeans?
5. **Mejoras:** ¿qué probarías para mejorar el modelo (otro algoritmo, más datos,
   otros hiperparámetros)?
""")

nb.md(r"""
### ✍️ Escribe aquí tus conclusiones

*(Haz doble clic para editar este texto y escribe tus respuestas.)*

1. ...
2. ...
3. ...
4. ...
5. ...
""")

nb.md(r"""
## 📊 Rúbrica de evaluación

Autoevalúate (o el instructor evalúa) con esta rúbrica. **Total: 100 puntos.**

| Criterio | Qué se evalúa | Puntos |
|---|---|---|
| **1. EDA (exploración)** | Carga los datos, usa `.head()` / `.info()`, cuenta y elimina faltantes con `dropna()`, y genera al menos una gráfica clara. | 20 |
| **2. Preprocesamiento** | Separa X/y correctamente, codifica categóricas y escala numéricas con `Pipeline` + `ColumnTransformer`, y hace el `train_test_split`. | 20 |
| **3. Modelo y evaluación** | Entrena el modelo dentro del pipeline y lo evalúa con `classification_report` y matriz de confusión, interpretando los resultados. | 25 |
| **4. Análisis no supervisado** | Aplica `PCA` a 2D, agrupa con `KMeans` y compara los grupos con las especies reales. | 20 |
| **5. Conclusiones** | Responde las preguntas de reflexión de forma clara y con base en los resultados. | 15 |
| | **TOTAL** | **100** |

> 🎯 **Aprobado sugerido:** 70/100. ¡Apunta a más!
""")

nb.md(r"""
## 🔁 Ideas de datasets alternativos

¿Quieres practicar más? Repite **todo este proyecto** con otro dataset. Solo cambian el
dataset, las columnas y la variable objetivo; los **pasos son los mismos**.

| Dataset | Cómo cargarlo | Objetivo supervisado |
|---|---|---|
| **Vino (wine)** | `from sklearn.datasets import load_wine` → `load_wine(as_frame=True)` | Clasificar el tipo de vino (3 clases) |
| **Cáncer de mama** | `from sklearn.datasets import load_breast_cancer` → `load_breast_cancer(as_frame=True)` | Clasificar tumor benigno/maligno |
| **Titanic** | `sns.load_dataset("titanic")` | Predecir si el pasajero sobrevivió (`survived`) |
| **Iris** | `from sklearn.datasets import load_iris` → `load_iris(as_frame=True)` | Clasificar la especie de flor |

> 💡 Con `load_wine`, `load_breast_cancer` e `load_iris` los datos ya vienen **numéricos y
> sin faltantes**, así que el preprocesamiento es más sencillo (no necesitas `OneHotEncoder`).
> Con **titanic** sí tendrás categóricas y faltantes: ¡perfecto para practicar lo aprendido!

---

## ✅ Repaso final del curso

En este proyecto integraste **todo el camino**:

- **EDA** y limpieza de datos reales.
- **Preprocesamiento** profesional con `Pipeline` + `ColumnTransformer`.
- **Aprendizaje supervisado**: entrenar, evaluar e interpretar un clasificador.
- **Aprendizaje no supervisado**: `PCA` para visualizar y `KMeans` para agrupar.

¡Excelente trabajo! 🐧🎉

Curso de Modelos de Aprendizaje · **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)
""")

nb.save("../notebooks/05_proyecto_final.ipynb")
