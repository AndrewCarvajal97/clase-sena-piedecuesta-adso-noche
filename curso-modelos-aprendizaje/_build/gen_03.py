"""Genera 03_no_supervisado.ipynb"""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 🧩 Notebook 3 — Aprendizaje NO supervisado

Curso práctico de Modelos de Aprendizaje · por **Pablo Andrés Carvajal** · [pablocarvajal.dev](https://pablocarvajal.dev)

---

En el aprendizaje **no supervisado** los datos **NO tienen etiquetas** (no sabemos la "respuesta
correcta"). El objetivo es **descubrir la estructura oculta** en los datos: grupos naturales,
patrones, relaciones o puntos raros.

En este notebook veremos:
- **Clustering (agrupamiento)**: K-Means, jerárquico y DBSCAN.
- **Reducción de dimensionalidad**: PCA y t-SNE.
- **Detección de anomalías**: Isolation Forest.

Todo se ejecuta en **Google Colab sin subir archivos** (usamos datasets de juguete y datasets
que ya vienen en scikit-learn).
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Semilla global para que los resultados sean reproducibles
np.random.seed(42)
""")

# =====================================================================
# K-MEANS
# =====================================================================
nb.md(r"""
## Parte A — Clustering con K-Means

**Clustering** = agrupar datos parecidos entre sí, **sin conocer** a qué grupo pertenecen.

**K-Means** es el algoritmo más popular:
1. Elegimos cuántos grupos queremos: **k**.
2. Coloca k "centros" al azar.
3. Asigna cada punto al centro más cercano.
4. Mueve cada centro al promedio de sus puntos. Repite hasta estabilizarse.

Primero creamos datos de juguete con `make_blobs` (manchas o "blobs" bien separados).
""")

nb.code(r"""
from sklearn.datasets import make_blobs

# 300 puntos agrupados en 4 manchas
X, _ = make_blobs(n_samples=300, centers=4, cluster_std=0.80, random_state=42)

plt.figure(figsize=(7, 5))
plt.scatter(X[:, 0], X[:, 1], s=30)
plt.title("Datos SIN etiquetas: ¿cuántos grupos ves?")
plt.xlabel("x1"); plt.ylabel("x2")
plt.show()
""")

nb.md(r"""
A simple vista parecen **4 grupos**. Apliquemos K-Means pidiéndole `n_clusters=4`.
""")

nb.code(r"""
from sklearn.cluster import KMeans

kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
etiquetas = kmeans.fit_predict(X)   # aprende los grupos y devuelve a qué grupo va cada punto
centros = kmeans.cluster_centers_

plt.figure(figsize=(7, 5))
plt.scatter(X[:, 0], X[:, 1], c=etiquetas, cmap="viridis", s=30)
plt.scatter(centros[:, 0], centros[:, 1],
            c="red", marker="X", s=250, edgecolors="black", label="centros")
plt.title("K-Means encontró 4 grupos")
plt.legend(); plt.show()
""")

nb.md(r"""
### ¿Cómo elegir k? — Método del codo

En la práctica **no sabemos** cuántos grupos hay. Una ayuda es la **inercia**: la suma de las
distancias de cada punto a su centro (qué tan "apretados" están los grupos). La inercia siempre
**baja** al aumentar k, pero llega un punto donde deja de bajar mucho: ese "codo" sugiere el k adecuado.
""")

nb.code(r"""
inercias = []
ks = range(1, 10)
for k in ks:
    km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)
    inercias.append(km.inertia_)

plt.figure(figsize=(7, 5))
plt.plot(ks, inercias, "o-")
plt.xlabel("k (número de grupos)"); plt.ylabel("Inercia")
plt.title("Método del codo: el 'codo' está en k=4")
plt.show()
""")

nb.md(r"""
### Otra ayuda — Silhouette score (coeficiente de silueta)

El **silhouette score** mide qué tan bien separados están los grupos, en un rango de **-1 a 1**
(más alto = mejor). El k con mayor silueta suele ser una buena elección.
""")

nb.code(r"""
from sklearn.metrics import silhouette_score

for k in range(2, 8):
    km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)
    score = silhouette_score(X, km.labels_)
    print(f"k = {k}  ->  silhouette = {score:.3f}")
""")

nb.md(r"""
### K-Means en un dataset real: Iris

Ahora usamos **Iris** (medidas de flores). Aunque el dataset trae la especie real,
**NO la usamos para entrenar**: dejamos que K-Means descubra los grupos solo. Al final
comparamos los grupos encontrados con la especie real, solo para **ver qué tan bien coinciden**.
""")

nb.code(r"""
from sklearn.datasets import load_iris

iris = load_iris()
X_iris = iris.data          # 4 medidas por flor
y_real = iris.target        # especie real (0,1,2) -> SOLO para comparar al final

km_iris = KMeans(n_clusters=3, random_state=42, n_init=10)
grupos = km_iris.fit_predict(X_iris)   # entrena SIN mirar y_real

# Tabla de contingencia: filas = especie real, columnas = grupo hallado
tabla = pd.crosstab(y_real, grupos,
                    rownames=["especie real"], colnames=["grupo K-Means"])
print(tabla)
""")

nb.md(r"""
> 👀 Los números de grupo (0,1,2) de K-Means **no tienen por qué coincidir** con los de la
> especie real: son solo etiquetas arbitrarias. Lo importante es que cada fila se concentre
> casi toda en **una** columna: eso significa que K-Means separó bastante bien las especies
> sin haberlas visto nunca.
""")

# =====================================================================
# CLUSTERING JERÁRQUICO
# =====================================================================
nb.md(r"""
## Parte B — Clustering jerárquico

En lugar de fijar k desde el inicio, el clustering **jerárquico** va uniendo los puntos más
parecidos poco a poco, formando un árbol llamado **dendrograma**. Cortando el árbol a cierta
altura decidimos cuántos grupos queremos.

Usamos `scipy` para dibujar el dendrograma (tomamos una muestra para que se vea claro).
""")

nb.code(r"""
from scipy.cluster.hierarchy import linkage, dendrogram

# Muestra pequeña de Iris para que el dendrograma sea legible
idx = np.random.choice(len(X_iris), size=30, replace=False)
X_muestra = X_iris[idx]

enlaces = linkage(X_muestra, method="ward")   # "ward" minimiza la varianza dentro de cada grupo

plt.figure(figsize=(10, 5))
dendrogram(enlaces)
plt.title("Dendrograma (clustering jerárquico)")
plt.xlabel("Puntos"); plt.ylabel("Distancia")
plt.show()
""")

nb.md(r"""
Cada unión del árbol junta grupos parecidos; la **altura** indica cuán diferentes eran.
Ahora aplicamos `AgglomerativeClustering` para obtener 3 grupos directamente sobre todo Iris.
""")

nb.code(r"""
from sklearn.cluster import AgglomerativeClustering

agrupador = AgglomerativeClustering(n_clusters=3)
grupos_jer = agrupador.fit_predict(X_iris)

tabla = pd.crosstab(y_real, grupos_jer,
                    rownames=["especie real"], colnames=["grupo jerárquico"])
print(tabla)
""")

# =====================================================================
# DBSCAN
# =====================================================================
nb.md(r"""
## Parte C — DBSCAN: grupos con formas raras

K-Means asume que los grupos son **redondos** (esféricos). Cuando los grupos tienen **formas
alargadas o curvas**, falla. Lo vemos con `make_moons` (dos "lunas" entrelazadas).

**DBSCAN** agrupa por **densidad**: junta puntos que están apretados y marca como **ruido**
(anomalías) los que quedan aislados. No necesita que le digamos cuántos grupos hay.
""")

nb.code(r"""
from sklearn.datasets import make_moons

X_moons, _ = make_moons(n_samples=300, noise=0.06, random_state=42)

plt.figure(figsize=(7, 5))
plt.scatter(X_moons[:, 0], X_moons[:, 1], s=30)
plt.title("Dos lunas: los grupos NO son redondos")
plt.show()
""")

nb.code(r"""
from sklearn.cluster import DBSCAN

# K-Means (falla en formas curvas)
km_moons = KMeans(n_clusters=2, random_state=42, n_init=10).fit_predict(X_moons)

# DBSCAN (agrupa por densidad)
db_moons = DBSCAN(eps=0.2, min_samples=5).fit_predict(X_moons)

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
axes[0].scatter(X_moons[:, 0], X_moons[:, 1], c=km_moons, cmap="viridis", s=30)
axes[0].set_title("K-Means: mezcla las lunas ❌")
axes[1].scatter(X_moons[:, 0], X_moons[:, 1], c=db_moons, cmap="viridis", s=30)
axes[1].set_title("DBSCAN: separa las lunas ✔")
plt.show()
""")

nb.md(r"""
> 👀 K-Means corta las lunas por la mitad porque solo sabe hacer grupos redondos.
> DBSCAN sigue la **densidad** y las separa correctamente. En DBSCAN, la etiqueta **-1**
> significa "ruido" (puntos que no pertenecen a ningún grupo denso).
""")

# =====================================================================
# PCA
# =====================================================================
nb.md(r"""
## Parte D — Reducción de dimensionalidad: PCA

Muchos datasets tienen **muchas columnas** (dimensiones) y no se pueden dibujar. **PCA**
(Análisis de Componentes Principales) los **resume en pocas dimensiones** conservando la mayor
información posible, para poder **visualizarlos** o acelerar otros algoritmos.

Usamos `load_digits`: imágenes de dígitos 8x8 = **64 dimensiones**. Las reducimos a 2.
""")

nb.code(r"""
from sklearn.datasets import load_digits
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

digits = load_digits()
X_dig = digits.data            # 64 columnas
y_dig = digits.target          # dígito real (0-9) -> solo para colorear

# Es buena práctica estandarizar antes de PCA
X_esc = StandardScaler().fit_transform(X_dig)

pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_esc)

print("Dimensiones originales:", X_dig.shape[1])
print("Dimensiones tras PCA :", X_pca.shape[1])
print("Varianza explicada por cada componente:", pca.explained_variance_ratio_.round(3))
print("Varianza explicada TOTAL (2 comp.):", pca.explained_variance_ratio_.sum().round(3))
""")

nb.md(r"""
La **varianza explicada** dice cuánta información conserva cada componente. Con solo 2
componentes perdemos detalle, pero ya podemos **dibujar** los 64 números en un plano.
""")

nb.code(r"""
plt.figure(figsize=(8, 6))
sc = plt.scatter(X_pca[:, 0], X_pca[:, 1], c=y_dig, cmap="tab10", s=15)
plt.colorbar(sc, label="dígito real")
plt.xlabel("Componente 1"); plt.ylabel("Componente 2")
plt.title("Dígitos en 2D con PCA (color = dígito real, solo para ver)")
plt.show()
""")

nb.md(r"""
### ¿Cuántos componentes necesito? — Varianza acumulada

Podemos ver cuántos componentes hacen falta para conservar, por ejemplo, el 90% de la información.
""")

nb.code(r"""
pca_full = PCA(random_state=42).fit(X_esc)
var_acum = np.cumsum(pca_full.explained_variance_ratio_)

plt.figure(figsize=(7, 5))
plt.plot(range(1, len(var_acum) + 1), var_acum, "o-")
plt.axhline(0.90, color="red", linestyle="--", label="90%")
plt.xlabel("Número de componentes"); plt.ylabel("Varianza explicada acumulada")
plt.title("¿Cuántos componentes conservar?")
plt.legend(); plt.show()
""")

# =====================================================================
# t-SNE
# =====================================================================
nb.md(r"""
## Parte E — t-SNE: visualización avanzada

**t-SNE** es otra técnica para llevar datos de muchas dimensiones a 2D, pensada **solo para
visualizar**. Suele separar mejor los grupos que PCA, pero es **más lenta** y no sirve para
transformar datos nuevos (solo para ver los que ya tenemos).
""")

nb.code(r"""
from sklearn.manifold import TSNE

# Usamos una muestra de 600 dígitos para que sea rápido en Colab
sub = np.random.choice(len(X_dig), size=600, replace=False)

tsne = TSNE(n_components=2, random_state=42, init="pca", perplexity=30)
X_tsne = tsne.fit_transform(X_dig[sub])

plt.figure(figsize=(8, 6))
sc = plt.scatter(X_tsne[:, 0], X_tsne[:, 1], c=y_dig[sub], cmap="tab10", s=15)
plt.colorbar(sc, label="dígito real")
plt.title("Dígitos con t-SNE (grupos mucho más claros)")
plt.show()
""")

nb.md(r"""
> 👀 Con t-SNE los 10 dígitos se ven como **islas** bien separadas. Recuerda: t-SNE es solo
> para **visualizar**; los ejes no tienen un significado interpretable como en PCA.
""")

# =====================================================================
# ISOLATION FOREST
# =====================================================================
nb.md(r"""
## Parte F — Detección de anomalías: Isolation Forest

A veces buscamos los **puntos raros** (fraudes, fallos, errores de medición). **Isolation Forest**
aísla los puntos: los anómalos se separan del resto con muy pocas divisiones, así que son fáciles
de "aislar".

Creamos datos normales + unos pocos puntos atípicos y vemos si el modelo los detecta.
""")

nb.code(r"""
from sklearn.ensemble import IsolationForest

# Datos normales (nube central) + 15 anomalías dispersas
normales = 0.4 * np.random.randn(200, 2)
anomalos = np.random.uniform(low=-4, high=4, size=(15, 2))
X_anom = np.vstack([normales, anomalos])

modelo_iso = IsolationForest(contamination=0.07, random_state=42)
pred = modelo_iso.fit_predict(X_anom)   # 1 = normal, -1 = anomalía

plt.figure(figsize=(7, 6))
plt.scatter(X_anom[pred == 1, 0],  X_anom[pred == 1, 1],
            c="steelblue", s=30, label="normal")
plt.scatter(X_anom[pred == -1, 0], X_anom[pred == -1, 1],
            c="red", marker="X", s=90, label="anomalía")
plt.title("Isolation Forest: puntos normales vs anómalos")
plt.legend(); plt.show()

print("Puntos marcados como anomalía:", int((pred == -1).sum()))
""")

# =====================================================================
# EJERCICIOS
# =====================================================================
nb.md(r"""
## 🏋️ Ejercicios

1. **K-Means:** vuelve a generar `make_blobs` con `centers=6` y `cluster_std=1.0`. Usa el
   **método del codo** y el **silhouette score** para decidir el mejor k. ¿Coinciden ambos?
2. **DBSCAN:** en las dos lunas, cambia el parámetro `eps` a `0.05` y luego a `0.5`.
   ¿Qué pasa cuando es muy pequeño? ¿Y cuando es muy grande? (fíjate en la etiqueta -1 = ruido).
3. **PCA:** aplica PCA con `n_components=2` sobre el dataset **Iris** (`load_iris`) y grafica los
   puntos coloreados por la especie real. ¿Se distinguen bien las 3 especies?
""")

nb.code(r"""
# ✍️ Tu código aquí

""")

# =====================================================================
# REPASO
# =====================================================================
nb.md(r"""
## ✅ Repaso

- El aprendizaje **no supervisado** trabaja **sin etiquetas**: busca estructura oculta.
- **Clustering:**
  - **K-Means** → rápido, pero asume grupos redondos; elegimos k con el **codo** y la **silueta**.
  - **Jerárquico** → construye un **dendrograma**; cortamos el árbol para elegir los grupos.
  - **DBSCAN** → agrupa por **densidad**, maneja formas raras y detecta ruido.
- **Reducción de dimensionalidad:**
  - **PCA** → resume muchas columnas en pocas conservando la **varianza**; sirve para visualizar y acelerar.
  - **t-SNE** → visualización potente en 2D, pero lenta y solo para ver.
- **Isolation Forest** → detecta **anomalías** (puntos raros).

**Siguiente:** `04_mixto_semisupervisado.ipynb` — combinamos datos con y sin etiquetas
(aprendizaje semisupervisado) y enfoques mixtos.
""")

nb.save("../notebooks/03_no_supervisado.ipynb")
