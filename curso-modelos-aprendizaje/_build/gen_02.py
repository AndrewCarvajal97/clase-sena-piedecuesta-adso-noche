"""Genera 02_supervisado_intermedio_avanzado.ipynb"""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 🚀 Notebook 2 — Aprendizaje supervisado (intermedio / avanzado)

Curso práctico de Modelos de Aprendizaje · por **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)

---

En el Notebook 1 vimos lo básico. Ahora damos el salto a un flujo de trabajo **profesional**,
el que se usa en proyectos reales:

- Datos **desordenados**: mezcla de columnas numéricas y categóricas, con **valores faltantes**.
- Preprocesamiento robusto con **`Pipeline` + `ColumnTransformer`** (sin fugas de datos).
- **Comparar varios modelos** (regresión logística, Random Forest, Gradient Boosting).
- **Validación cruzada** para medir de forma confiable.
- **Ajuste de hiperparámetros** con `GridSearchCV`.
- **Métricas avanzadas**: precision, recall, F1, matriz de confusión y **curva ROC / AUC**.
- **Importancia de features** para interpretar el modelo.

Trabajaremos con el famoso dataset **Titanic**: predecir quién **sobrevivió** (`survived`).
Todo corre en **Google Colab sin subir archivos** (Colab tiene internet).
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_theme()

# Reproducibilidad: usamos siempre la misma semilla
RANDOM_STATE = 42
""")

nb.md(r"""
## 1. Cargar y explorar el dataset Titanic

El dataset viene incluido en **seaborn** y se descarga solo. Cada fila es un pasajero.
Queremos predecir la columna `survived` (1 = sobrevivió, 0 = no).
""")

nb.code(r"""
df = sns.load_dataset("titanic")   # se descarga automáticamente
print("Forma (filas, columnas):", df.shape)
df.head()
""")

nb.md(r"""
Fíjate que hay de todo:
- **Columnas numéricas**: `age` (edad), `fare` (tarifa), `pclass` (clase del boleto).
- **Columnas categóricas** (texto): `sex` (sexo), `embarked` (puerto de embarque).
- Y además hay **valores faltantes** (celdas vacías, `NaN`).

Veamos cuántos faltantes hay:
""")

nb.code(r"""
# Cantidad de valores faltantes por columna (solo las que nos interesan)
columnas = ["survived", "age", "fare", "pclass", "sex", "embarked"]
df[columnas].isna().sum()
""")

nb.md(r"""
`age` y `embarked` tienen faltantes. **No podemos entrenar un modelo con celdas vacías**,
así que tendremos que **imputarlas** (rellenarlas con un valor razonable). Lo haremos
de forma automática dentro de un pipeline.
""")

nb.code(r"""
# Elegimos las columnas de entrada (features) y el objetivo (y)
num_features = ["age", "fare", "pclass"]   # numéricas
cat_features = ["sex", "embarked"]         # categóricas

X = df[num_features + cat_features].copy()
y = df["survived"].copy()

print("X:", X.shape, " | y:", y.shape)
print("Distribución del objetivo:")
print(y.value_counts(normalize=True).round(3))   # ~38% sobrevivió, ~62% no
""")

nb.md(r"""
## 2. Separar en entrenamiento y prueba

Como siempre, reservamos un 20% para el "examen" final. Usamos `stratify=y` para que la
proporción de sobrevivientes sea la misma en train y test (importante cuando las clases
están desbalanceadas).
""")

nb.code(r"""
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
print("Entrenamiento:", len(X_train), " | Prueba:", len(X_test))
""")

nb.md(r"""
## 3. Preprocesamiento profesional: `Pipeline` + `ColumnTransformer`

Aquí está el corazón del notebook. Necesitamos aplicar **transformaciones distintas** a cada
tipo de columna:

- **Numéricas** (`age`, `fare`, `pclass`):
  1. `SimpleImputer(strategy="median")` → rellena faltantes con la **mediana**.
  2. `StandardScaler()` → **escala** para que todas tengan media 0 y desviación 1.
- **Categóricas** (`sex`, `embarked`):
  1. `SimpleImputer(strategy="most_frequent")` → rellena con el valor **más común**.
  2. `OneHotEncoder()` → convierte texto en columnas de 0/1 (el modelo solo entiende números).

El `ColumnTransformer` aplica cada bloque a las columnas correctas y junta todo.

### 🔒 ¿Por qué un Pipeline evita fugas de datos (*data leakage*)?

Si calcularas la mediana o el escalado usando **todo** el dataset (train + test), estarías
"colando" información del test dentro del entrenamiento → mediría mejor de lo real.
Con un `Pipeline`, cada paso **aprende sus parámetros SOLO con `X_train`** (en `.fit`) y luego
los **aplica** al test (en `.transform`). Además, en la validación cruzada esto se respeta
en cada pliegue. Resultado: una evaluación **honesta**.
""")

nb.code(r"""
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

# Bloque para columnas numéricas
transformador_num = Pipeline(steps=[
    ("imputar", SimpleImputer(strategy="median")),
    ("escalar", StandardScaler()),
])

# Bloque para columnas categóricas
transformador_cat = Pipeline(steps=[
    ("imputar", SimpleImputer(strategy="most_frequent")),
    ("codificar", OneHotEncoder(handle_unknown="ignore")),
])

# Une ambos bloques, cada uno aplicado a sus columnas
preprocesador = ColumnTransformer(transformers=[
    ("num", transformador_num, num_features),
    ("cat", transformador_cat, cat_features),
])

preprocesador
""")

nb.md(r"""
## 4. Comparar varios modelos

Metemos el `preprocesador` y un **clasificador** dentro de un mismo `Pipeline`. Así, con una
sola llamada a `.fit()`, se preprocesa y se entrena todo junto. Compararemos tres modelos:

- **`LogisticRegression`**: modelo lineal, rápido e interpretable.
- **`RandomForestClassifier`**: muchos árboles votando; potente y robusto.
- **`GradientBoostingClassifier`**: árboles que corrigen los errores de los anteriores.
""")

nb.code(r"""
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score

modelos = {
    "Regresión logística": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
    "Random Forest":       RandomForestClassifier(random_state=RANDOM_STATE),
    "Gradient Boosting":   GradientBoostingClassifier(random_state=RANDOM_STATE),
}

resultados = {}
for nombre, clasificador in modelos.items():
    pipe = Pipeline(steps=[
        ("preprocesador", preprocesador),
        ("modelo", clasificador),
    ])
    pipe.fit(X_train, y_train)                      # preprocesa + entrena
    pred = pipe.predict(X_test)
    exactitud = accuracy_score(y_test, pred)
    resultados[nombre] = exactitud
    print(f"{nombre:22s} -> exactitud en test: {exactitud:.2%}")
""")

nb.code(r"""
# Gráfica comparativa
plt.figure(figsize=(7, 4))
nombres = list(resultados.keys())
valores = list(resultados.values())
sns.barplot(x=valores, y=nombres, palette="viridis")
plt.xlabel("Exactitud en test"); plt.xlim(0, 1)
for i, v in enumerate(valores):
    plt.text(v + 0.01, i, f"{v:.2%}", va="center")
plt.title("Comparación de modelos (un solo split)")
plt.show()
""")

nb.md(r"""
## 5. Validación cruzada (*cross-validation*)

Un solo split train/test puede ser **engañoso**: quizá tuvimos suerte (o mala suerte) con esa
división en particular. La **validación cruzada** divide los datos en `k` partes (pliegues),
entrena con `k-1` y evalúa con la restante, **rotando** k veces. Luego promedia.

Es **más confiable** porque cada dato pasa por el "examen" una vez, y obtenemos también la
**variabilidad** (desviación estándar) del rendimiento.
""")

nb.code(r"""
from sklearn.model_selection import cross_val_score

for nombre, clasificador in modelos.items():
    pipe = Pipeline(steps=[
        ("preprocesador", preprocesador),
        ("modelo", clasificador),
    ])
    # cv=5 -> 5 pliegues. Usamos TODO X (la CV hace sus propias divisiones internas)
    scores = cross_val_score(pipe, X, y, cv=5, scoring="accuracy")
    print(f"{nombre:22s} -> {scores.mean():.2%} (+/- {scores.std():.2%})")
""")

nb.md(r"""
> 👀 El número después de `+/-` es la **desviación estándar**: qué tanto varía el resultado
> entre pliegues. Un modelo con exactitud alta **y** desviación baja es más confiable.
""")

nb.md(r"""
## 6. Ajuste de hiperparámetros con `GridSearchCV`

Los modelos tienen **hiperparámetros** que nosotros elegimos (no los aprende el modelo).
Por ejemplo, en el Random Forest: cuántos árboles (`n_estimators`) y qué tan profundos
(`max_depth`). `GridSearchCV` **prueba todas las combinaciones** que le demos, evaluando cada
una con validación cruzada, y se queda con la mejor.

Nota: los parámetros se nombran con el prefijo del paso del pipeline: `modelo__n_estimators`
(doble guion bajo `__`).
""")

nb.code(r"""
from sklearn.model_selection import GridSearchCV

pipe_rf = Pipeline(steps=[
    ("preprocesador", preprocesador),
    ("modelo", RandomForestClassifier(random_state=RANDOM_STATE)),
])

# Malla de combinaciones a probar
param_grid = {
    "modelo__n_estimators": [100, 200, 300],
    "modelo__max_depth":    [4, 6, 8, None],
}

grid = GridSearchCV(
    pipe_rf, param_grid,
    cv=5, scoring="accuracy", n_jobs=-1
)
grid.fit(X_train, y_train)

print("Mejores hiperparámetros:", grid.best_params_)
print(f"Mejor exactitud (validación cruzada): {grid.best_score_:.2%}")
""")

nb.code(r"""
# El mejor modelo ya está entrenado; lo evaluamos en el test que reservamos
mejor_modelo = grid.best_estimator_
pred = mejor_modelo.predict(X_test)
print(f"Exactitud en test (modelo ajustado): {accuracy_score(y_test, pred):.2%}")
""")

nb.md(r"""
## 7. Métricas avanzadas

La **exactitud** no lo dice todo, sobre todo con clases desbalanceadas. Miremos más a fondo.

### `classification_report`: precision, recall y F1

- **Precision**: de los que el modelo dijo "sobrevivió", ¿cuántos realmente sí? (evita falsas alarmas).
- **Recall**: de los que realmente sobrevivieron, ¿cuántos detectó? (evita dejar casos sin identificar).
- **F1**: equilibrio entre ambos.

**¿Cuándo importa cada uno?** Depende del costo del error:
- Si un **falso positivo** es caro (ej.: marcar un correo bueno como spam) → prioriza **precision**.
- Si un **falso negativo** es peligroso (ej.: no detectar una enfermedad) → prioriza **recall**.
""")

nb.code(r"""
from sklearn.metrics import classification_report

print(classification_report(
    y_test, pred, target_names=["No sobrevivió", "Sobrevivió"]
))
""")

nb.md(r"""
### Matriz de confusión

Muestra aciertos y errores en una tabla: verdaderos positivos/negativos y falsos positivos/negativos.
""")

nb.code(r"""
from sklearn.metrics import ConfusionMatrixDisplay

ConfusionMatrixDisplay.from_estimator(
    mejor_modelo, X_test, y_test,
    display_labels=["No sobrevivió", "Sobrevivió"],
    cmap="Blues"
)
plt.title("Matriz de confusión (Random Forest ajustado)")
plt.show()
""")

nb.md(r"""
### Curva ROC y AUC

La **curva ROC** muestra el equilibrio entre detectar positivos (recall) y las falsas alarmas,
al variar el umbral de decisión. El **AUC** (área bajo la curva) la resume en un número:

- **1.0** = clasificador perfecto.
- **0.5** = azar (no aprende nada).

Es muy útil porque **no depende de un umbral fijo** y funciona bien con clases desbalanceadas.
""")

nb.code(r"""
from sklearn.metrics import roc_auc_score, RocCurveDisplay

# Probabilidad de la clase positiva (sobrevivió = 1)
proba = mejor_modelo.predict_proba(X_test)[:, 1]
auc = roc_auc_score(y_test, proba)
print(f"AUC: {auc:.3f}")

RocCurveDisplay.from_estimator(mejor_modelo, X_test, y_test)
plt.plot([0, 1], [0, 1], "k--", label="Azar (AUC=0.5)")
plt.title("Curva ROC — Random Forest ajustado")
plt.legend()
plt.show()
""")

nb.md(r"""
## 8. Importancia de features

El Random Forest puede decirnos **qué variables pesaron más** en sus decisiones. Para etiquetar
bien las barras necesitamos los nombres de las columnas **después** del preprocesamiento
(el `OneHotEncoder` crea columnas nuevas como `sex_male`, `embarked_S`, etc.). Los obtenemos
con `get_feature_names_out()`.
""")

nb.code(r"""
# Nombres de las features tras el preprocesamiento
nombres_features = mejor_modelo.named_steps["preprocesador"].get_feature_names_out()

# Importancias del Random Forest
importancias = mejor_modelo.named_steps["modelo"].feature_importances_

imp = pd.Series(importancias, index=nombres_features).sort_values()

plt.figure(figsize=(8, 5))
imp.plot(kind="barh", color="teal")
plt.title("Importancia de cada feature (Random Forest)")
plt.xlabel("Importancia")
plt.tight_layout()
plt.show()

print("Feature más importante:", imp.idxmax())
""")

nb.md(r"""
> 👀 Normalmente el **sexo** y la **tarifa/clase** son de las más importantes: en el Titanic,
> mujeres y pasajeros de primera clase tuvieron más probabilidad de sobrevivir.

## 🏋️ Ejercicios

1. **Más columnas**: agrega `sibsp` (hermanos/cónyuge a bordo) y `parch` (padres/hijos) a
   `num_features`, vuelve a entrenar y observa si mejora el AUC.
2. **Otra malla**: en el `GridSearchCV`, ajusta el `GradientBoostingClassifier` en vez del
   Random Forest (prueba `modelo__learning_rate` y `modelo__n_estimators`). Compara `best_score_`.
3. **Umbral y recall**: usando `proba`, clasifica como "sobrevivió" cuando la probabilidad sea
   mayor a **0.3** (en vez de 0.5). ¿Sube el recall? ¿Qué pasa con la precision?
""")

nb.code(r"""
# ✍️ Tu código aquí

""")

nb.md(r"""
## ✅ Repaso

- Con `Pipeline` + `ColumnTransformer` preprocesamos numéricas y categóricas **sin fugas de datos**.
- Comparamos **varios modelos** y usamos **validación cruzada** para medir de forma confiable.
- Ajustamos hiperparámetros con **`GridSearchCV`** (`best_params_`, `best_score_`).
- Fuimos más allá de la exactitud: **precision, recall, F1**, matriz de confusión y **ROC/AUC**.
- Interpretamos el modelo con la **importancia de features**.

Este es el flujo de trabajo real de un proyecto de Machine Learning supervisado. 🎉

**Siguiente:** `03_no_supervisado.ipynb` — aprender **sin etiquetas**: agrupamiento (clustering)
y reducción de dimensionalidad.
""")

nb.save("../notebooks/02_supervisado_intermedio_avanzado.ipynb")
