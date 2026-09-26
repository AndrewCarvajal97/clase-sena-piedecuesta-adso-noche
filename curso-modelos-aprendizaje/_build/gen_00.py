"""Genera 00_introduccion_y_setup.ipynb"""
from nbhelper import Nb

nb = Nb()

nb.md(r"""
# 🚀 Curso práctico de Modelos de Aprendizaje
## Notebook 0 — Introducción y preparación

**Aprendizaje supervisado, no supervisado y mixto — de lo básico a lo avanzado.**

Por **Pablo Andrés Carvajal** · Desarrollador Full Stack · [pablocarvajal.dev](https://pablocarvajal.dev)

---

En este primer notebook vamos a:
- Entender qué es el Machine Learning y sus **3 grandes tipos**.
- Aprender a movernos en **Google Colab**.
- Conocer las librerías que usaremos todo el curso.
- Cargar, explorar y graficar nuestro primer conjunto de datos.

> 💡 **Cómo usar este notebook:** ejecuta cada celda de código con **Shift + Enter**.
> Ve leyendo las celdas de texto y corriendo las de código en orden.
""")

nb.md(r"""
## 1. ¿Qué es el Machine Learning?

En la programación tradicional le damos a la máquina **reglas + datos** y obtenemos respuestas.
En **Machine Learning (ML)** le damos **datos + respuestas** y la máquina **descubre las reglas** (el *modelo*).

### Los 3 tipos que veremos en el curso

| Tipo | ¿Tiene "respuestas" (etiquetas)? | Para qué sirve | Ejemplo |
|------|:---:|---|---|
| **Supervisado** | Sí | Predecir una categoría o un número | Detectar spam, predecir precios |
| **No supervisado** | No | Descubrir grupos o estructura oculta | Segmentar clientes |
| **Mixto (semi-supervisado)** | Pocas | Aprovechar muchos datos sin etiquetar | Clasificar con pocas etiquetas |

Cada bloque del curso es un notebook:
- **01** Supervisado básico · **02** Supervisado intermedio-avanzado
- **03** No supervisado · **04** Mixto (semi-supervisado) · **05** Proyecto final
""")

nb.md(r"""
## 2. Google Colab en 1 minuto

- Un **notebook** son celdas de **texto** (como esta) y de **código** (las grises).
- Ejecuta una celda con **Shift + Enter** (o el botón ▶️ a su izquierda).
- Arriba, en **Entorno de ejecución → Cambiar tipo de entorno**, puedes elegir CPU/GPU (para este curso basta **CPU**).
- Todo corre en la nube de Google: **no instalas nada** en tu computador.

Vamos a comprobar que Python funciona 👇
""")

nb.code(r"""
# La celda más simple: una operación y un mensaje
print("¡Hola! Colab está funcionando ✅")
print("2 + 2 =", 2 + 2)
""")

nb.md(r"""
## 3. Las librerías del curso

Ya vienen instaladas en Colab. Las importamos con un "apodo" (alias) estándar:

- **numpy** (`np`): cálculo numérico y arreglos.
- **pandas** (`pd`): tablas de datos (como un Excel programable).
- **matplotlib** (`plt`) y **seaborn** (`sns`): gráficas.
- **scikit-learn** (`sklearn`): los modelos de ML.
""")

nb.code(r"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import sklearn

sns.set_theme()  # estilo bonito para las gráficas

print("Versiones instaladas:")
print("numpy      ", np.__version__)
print("pandas     ", pd.__version__)
print("scikit-learn", sklearn.__version__)
""")

nb.md(r"""
## 4. Nuestro primer dataset: Iris 🌸

**Iris** es un conjunto de datos clásico: medidas de 150 flores de 3 especies.
Viene incluido en scikit-learn, así que **no hay que descargar nada**.
""")

nb.code(r"""
from sklearn.datasets import load_iris

iris = load_iris(as_frame=True)   # as_frame=True lo entrega como tabla de pandas
df = iris.frame                   # la tabla completa (features + objetivo)

# Renombramos la columna objetivo a algo legible
df["especie"] = iris.target_names[iris.target]

df.head()   # muestra las primeras 5 filas
""")

nb.md(r"""
### Explorar los datos con pandas

Antes de modelar, **siempre** miramos los datos. Comandos útiles:
- `df.shape` → (filas, columnas)
- `df.info()` → tipos de datos y valores faltantes
- `df.describe()` → estadísticas (media, mínimo, máximo…)
- `df["columna"].value_counts()` → cuántos hay de cada categoría
""")

nb.code(r"""
print("Forma (filas, columnas):", df.shape)
print("\n¿Cuántas flores de cada especie?")
print(df["especie"].value_counts())

df.describe()
""")

nb.md(r"""
## 5. Primera visualización

Una imagen dice más que mil filas. Con **seaborn** vemos cómo se separan las especies
según el largo y ancho del pétalo.
""")

nb.code(r"""
plt.figure(figsize=(7, 5))
sns.scatterplot(
    data=df,
    x="petal length (cm)",
    y="petal width (cm)",
    hue="especie",     # color por especie
    s=70,
)
plt.title("Iris: las especies se separan por el tamaño del pétalo")
plt.show()
""")

nb.md(r"""
> 👀 **Observa:** las tres especies forman grupos bastante separados.
> Por eso un modelo podrá aprender a distinguirlas. En el Notebook 01 haremos justamente eso.

### Bonus: ver todas las combinaciones a la vez
""")

nb.code(r"""
sns.pairplot(df, hue="especie", height=1.8)
plt.show()
""")

nb.md(r"""
## 6. 🏋️ Ejercicio

1. Muestra las **últimas** 5 filas de `df` (pista: `df.tail()`).
2. Calcula el **promedio** del `sepal length (cm)` para cada especie
   (pista: `df.groupby("especie")["sepal length (cm)"].mean()`).
3. Haz un `scatterplot` usando ahora `sepal length (cm)` y `sepal width (cm)`.
   ¿Se separan igual de bien las especies?

Escribe tu código en la celda de abajo 👇
""")

nb.code(r"""
# ✍️ Tu código aquí

""")

nb.md(r"""
## ✅ Repaso

- El ML aprende **reglas a partir de datos**; hay 3 tipos: supervisado, no supervisado y mixto.
- En Colab se ejecuta con **Shift + Enter** y no se instala nada.
- Usamos **pandas** para explorar y **seaborn** para graficar.
- Siempre **miramos y graficamos** los datos antes de modelar.

**Siguiente:** `01_supervisado_basico.ipynb` — entrenaremos nuestros primeros modelos para
**predecir** (regresión) y **clasificar**.
""")

nb.save("../notebooks/00_introduccion_y_setup.ipynb")
