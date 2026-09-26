"""Genera 04_mixto_semisupervisado.ipynb"""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 🧩 Notebook 4 — Aprendizaje mixto (semi-supervisado)

Curso práctico de Modelos de Aprendizaje · por **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)

---

## El problema real: etiquetar datos es caro

En el mundo real casi siempre pasa lo mismo: tenemos **muchísimos datos**, pero
**poquísimos con etiqueta**. Poner la etiqueta correcta (¿es spam?, ¿qué enfermedad
muestra esta radiografía?, ¿qué dígito es este número escrito a mano?) requiere
**tiempo de personas expertas** y eso **cuesta dinero**.

- **Supervisado** (Notebooks 1 y 2): necesita **todo** etiquetado. Muy preciso, pero caro.
- **No supervisado** (Notebook 3): no usa etiquetas, pero no te dice la "respuesta".
- **Semi-supervisado (mixto)**: usa **los pocos datos etiquetados + los muchos sin etiqueta**
  a la vez. Aprovecha lo mejor de ambos mundos.

### Objetivos de este notebook
1. Simular el escenario real: ocultar la mayoría de las etiquetas.
2. Medir una **línea base** usando solo los pocos datos etiquetados.
3. Probar **Self-training** (el modelo se auto-etiqueta).
4. Probar **Label Spreading / Label Propagation** (propagar etiquetas por similitud).
5. **Comparar** todo contra el "tope" ideal (todas las etiquetas).
6. Ver un enfoque mixto extra: **KMeans + etiquetas** (pseudo-etiquetas por grupo).
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)
""")

nb.md(r"""
## 1. Preparar el escenario

Usaremos **`load_digits`**: imágenes pequeñas (8x8) de dígitos escritos a mano (0 al 9).
Tiene ~1797 ejemplos, perfecto para simular "muchos datos".

La idea es imitar la vida real: imaginemos que **alguien solo tuvo tiempo de etiquetar
el 10%** de las imágenes de entrenamiento, y el otro 90% quedó **sin etiqueta**.
""")

nb.code(r"""
from sklearn.datasets import load_digits

digits = load_digits()
X = digits.data      # 1797 filas x 64 columnas (cada pixel de la imagen 8x8)
y = digits.target    # etiqueta real: el dígito 0..9

print("Datos:", X.shape, " | Etiquetas:", y.shape)
print("Clases:", np.unique(y))
""")

nb.code(r"""
# Veamos algunas imágenes de ejemplo
fig, axes = plt.subplots(1, 8, figsize=(11, 2))
for ax, img, lab in zip(axes, digits.images, digits.target):
    ax.imshow(img, cmap="gray_r")
    ax.set_title(str(lab))
    ax.axis("off")
plt.suptitle("Ejemplos de dígitos (load_digits)")
plt.show()
""")

nb.md(r"""
### Paso 1 — Dividir en entrenamiento y prueba

El conjunto de **prueba** siempre conserva sus etiquetas reales: es nuestro "examen final"
para medir de forma honesta. Solo ocultaremos etiquetas en el **entrenamiento**.
""")

nb.code(r"""
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=RANDOM_STATE, stratify=y
)
print("Entrenamiento:", len(X_train), " | Prueba:", len(X_test))
""")

nb.md(r"""
### Paso 2 — Ocultar la mayoría de las etiquetas

En scikit-learn, la convención para decir **"este dato NO tiene etiqueta"** es ponerle **`-1`**.

Vamos a crear `y_train_mixto`: una copia de `y_train` donde **solo el 10%** conserva su
etiqueta real y el **90% restante** se marca con `-1`.
""")

nb.code(r"""
PORCENTAJE_ETIQUETADO = 0.10   # solo el 10% conserva su etiqueta

rng = np.random.RandomState(RANDOM_STATE)
# Elegimos al azar CUÁLES índices quedan "sin etiqueta"
mascara_sin_etiqueta = rng.rand(len(y_train)) > PORCENTAJE_ETIQUETADO

y_train_mixto = np.copy(y_train)
y_train_mixto[mascara_sin_etiqueta] = -1   # -1 = "sin etiqueta"

n_etiquetados = np.sum(y_train_mixto != -1)
n_sin_etiqueta = np.sum(y_train_mixto == -1)
print(f"Con etiqueta real : {n_etiquetados}")
print(f"Sin etiqueta (-1) : {n_sin_etiqueta}")
print(f"Porcentaje etiquetado real: {n_etiquetados / len(y_train):.1%}")
""")

nb.md(r"""
> 👀 Fíjate: `y_train_mixto` tiene la **misma cantidad de filas** que `X_train`, pero
> la mayoría de sus valores son `-1`. Los modelos semi-supervisados saben interpretar
> ese `-1` como "aún no sé la respuesta de este dato".

## 2. Línea base — solo con los pocos datos etiquetados

Lo más básico que podríamos hacer: **ignorar** todos los datos sin etiqueta y entrenar
un clasificador normal usando **solo el 10% etiquetado**. Esto nos da el punto de partida
que queremos **superar**.
""")

nb.code(r"""
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# Nos quedamos SOLO con las filas que sí tienen etiqueta
idx_etiquetados = y_train_mixto != -1
X_pocos = X_train[idx_etiquetados]
y_pocos = y_train_mixto[idx_etiquetados]

base = LogisticRegression(max_iter=5000, random_state=RANDOM_STATE)
base.fit(X_pocos, y_pocos)

acc_base = accuracy_score(y_test, base.predict(X_test))
print(f"Datos usados para entrenar: {len(y_pocos)}")
print(f"Exactitud (solo pocas etiquetas): {acc_base:.2%}")
""")

nb.md(r"""
Guarda ese número en tu cabeza. Todo lo demás intentará **mejorarlo** aprovechando
también los datos sin etiqueta.

## 3. Self-training (auto-entrenamiento)

**Idea:** el modelo se entrena con los pocos datos etiquetados, luego **predice** los
datos sin etiqueta y **se cree** sus predicciones más **confiadas** (las de mayor
probabilidad). Esas se convierten en "pseudo-etiquetas" y el modelo se re-entrena con
ellas. Repite el ciclo varias veces.

Usamos `SelfTrainingClassifier` envolviendo un estimador base que sepa dar probabilidades.
Aquí le pasamos **TODO** el entrenamiento, incluyendo los `-1`.
""")

nb.code(r"""
from sklearn.semi_supervised import SelfTrainingClassifier

estimador_base = LogisticRegression(max_iter=5000, random_state=RANDOM_STATE)
self_training = SelfTrainingClassifier(estimador_base, threshold=0.75)

# ¡Ojo! aquí usamos y_train_mixto (con los -1), no y_train real
self_training.fit(X_train, y_train_mixto)

acc_self = accuracy_score(y_test, self_training.predict(X_test))
print(f"Exactitud (self-training): {acc_self:.2%}")
""")

nb.md(r"""
> El parámetro `threshold=0.75` significa: "solo confía en una predicción si su
> probabilidad supera el 75%". Así evita auto-etiquetarse con casos dudosos.

## 4. Label Spreading (propagación de etiquetas)

**Idea totalmente distinta:** imagina todos los puntos como una **red** donde los puntos
**parecidos** están conectados. Las pocas etiquetas conocidas se **propagan como una mancha
de tinta** por la red hacia sus vecinos más cercanos, hasta que todos los puntos reciben
una etiqueta estimada.

`LabelSpreading` (primo de `LabelPropagation`, un poco más robusto al ruido) también recibe
`y_train_mixto` con sus `-1`.
""")

nb.code(r"""
from sklearn.semi_supervised import LabelSpreading

label_spreading = LabelSpreading(kernel="knn", n_neighbors=7)
label_spreading.fit(X_train, y_train_mixto)

acc_spread = accuracy_score(y_test, label_spreading.predict(X_test))
print(f"Exactitud (label spreading): {acc_spread:.2%}")
""")

nb.md(r"""
## 5. El "tope" ideal — con TODAS las etiquetas

¿Qué tan bien lo haríamos si **por arte de magia** tuviéramos etiquetadas las 1257
imágenes de entrenamiento? Ese es el **techo** al que aspiramos. Rara vez lo alcanzamos,
pero sirve de referencia.
""")

nb.code(r"""
tope = LogisticRegression(max_iter=5000, random_state=RANDOM_STATE)
tope.fit(X_train, y_train)   # aquí usamos y_train COMPLETO (todas las etiquetas)

acc_tope = accuracy_score(y_test, tope.predict(X_test))
print(f"Exactitud (tope, todas las etiquetas): {acc_tope:.2%}")
""")

nb.md(r"""
## 6. Comparación final

Juntemos todo en una tabla y en un gráfico de barras para verlo claro.
""")

nb.code(r"""
resultados = pd.DataFrame({
    "Metodo": [
        "Solo pocas etiquetas (10%)",
        "Self-training",
        "Label spreading",
        "Tope (todas las etiquetas)",
    ],
    "Exactitud": [acc_base, acc_self, acc_spread, acc_tope],
})
resultados
""")

nb.code(r"""
plt.figure(figsize=(8, 5))
colores = ["#c0392b", "#2980b9", "#27ae60", "#7f8c8d"]
barras = plt.bar(resultados["Metodo"], resultados["Exactitud"], color=colores)
plt.ylabel("Exactitud en test")
plt.ylim(0, 1)
plt.title("¿Ayuda usar los datos sin etiqueta?")
plt.xticks(rotation=20, ha="right")
for barra, valor in zip(barras, resultados["Exactitud"]):
    plt.text(barra.get_x() + barra.get_width() / 2, valor + 0.01,
             f"{valor:.1%}", ha="center", fontweight="bold")
plt.tight_layout()
plt.show()
""")

nb.md(r"""
### 💡 ¿Qué observamos?

- La **línea base** (solo 10%) suele ser la más baja: desaprovecha el 90% de los datos.
- **Self-training** y **label spreading** normalmente **superan** a la línea base
  **sin pagar por etiquetar más datos**. ¡Ese es el valor del semi-supervisado!
- El **tope** casi siempre gana, pero exigió etiquetar todo (caro). Lo interesante es
  ver **qué tan cerca del tope** llegamos con solo el 10% etiquetado.

> ⚠️ El semi-supervisado no siempre gana. Funciona bien cuando los datos parecidos
> tienden a compartir la misma etiqueta. Si esa suposición no se cumple, puede incluso
> empeorar (propaga etiquetas equivocadas).

## 7. Enfoque mixto extra: KMeans + pseudo-etiquetas

Otra forma de combinar **no supervisado + supervisado**: primero **agrupamos** con
KMeans (sin mirar etiquetas) y luego, con las **pocas** etiquetas que sí tenemos,
le ponemos nombre a cada grupo (**la etiqueta mayoritaria del grupo**). Así generamos
pseudo-etiquetas para TODO el conjunto.
""")

nb.code(r"""
from sklearn.cluster import KMeans
from scipy.stats import mode

# 1) Agrupamos en 10 clusters (sabemos que hay 10 dígitos), SIN usar etiquetas
km = KMeans(n_clusters=10, random_state=RANDOM_STATE, n_init=10)
grupos_train = km.fit_predict(X_train)

# 2) A cada grupo le asignamos la etiqueta REAL más frecuente
#    ...pero usando SOLO los pocos datos etiquetados (los que no son -1)
etiqueta_de_grupo = {}
for g in range(10):
    # dígitos etiquetados que cayeron en este grupo
    en_grupo = (grupos_train == g) & (y_train_mixto != -1)
    if np.any(en_grupo):
        etiqueta_de_grupo[g] = mode(y_train_mixto[en_grupo], keepdims=False).mode
    else:
        etiqueta_de_grupo[g] = -1   # grupo sin ningún dato etiquetado

print("Etiqueta asignada a cada grupo:", etiqueta_de_grupo)
""")

nb.code(r"""
# 3) Evaluamos en test: predecir grupo con KMeans y traducir a su etiqueta
grupos_test = km.predict(X_test)
pred_kmeans = np.array([etiqueta_de_grupo[g] for g in grupos_test])

acc_kmeans = accuracy_score(y_test, pred_kmeans)
print(f"Exactitud (KMeans + pseudo-etiquetas): {acc_kmeans:.2%}")
""")

nb.md(r"""
Este truco es rápido y no necesita casi etiquetas, pero su calidad depende de que los
grupos que encuentra KMeans **coincidan** con las clases reales. Es una idea sencilla y
muy útil para arrancar cuando casi no tienes etiquetas.

## 🏋️ Ejercicios

1. Cambia `PORCENTAJE_ETIQUETADO` a `0.05` (solo 5%) y vuelve a correr todo.
   ¿Qué métodos aguantan mejor con tan pocas etiquetas?
2. En `SelfTrainingClassifier`, prueba `threshold=0.9` y `threshold=0.5`.
   ¿Cómo cambia la exactitud? ¿Por qué un umbral muy bajo puede ser peligroso?
3. Reemplaza `LabelSpreading` por `LabelPropagation` (mismo módulo `sklearn.semi_supervised`)
   y compara. Además prueba `kernel="rbf"` en lugar de `"knn"`.
""")

nb.code(r"""
# ✍️ Tu código aquí

""")

nb.md(r"""
## ✅ Repaso

- **Etiquetar es caro**: casi siempre hay muchos datos sin etiqueta y pocos con etiqueta.
- En scikit-learn, **`-1` significa "sin etiqueta"**.
- El **semi-supervisado** aprovecha ambos tipos de datos a la vez:
  - **Self-training**: el modelo se auto-etiqueta con sus predicciones más confiadas.
  - **Label spreading / propagation**: propaga etiquetas por **similitud** entre vecinos.
- Suelen **superar** la línea base (solo pocas etiquetas) sin pagar por etiquetar más.
- **KMeans + pseudo-etiquetas** es otra forma sencilla de mezclar no supervisado y supervisado.
- Siempre comparamos contra el **tope** (todas las etiquetas) para saber cuánto margen ganamos.

**Siguiente:** `05_proyecto_final.ipynb` — juntamos todo lo aprendido en un proyecto completo.
""")

nb.save("../notebooks/04_mixto_semisupervisado.ipynb")
