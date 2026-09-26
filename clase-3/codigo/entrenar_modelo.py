"""
Clase 3 — Crear un modelo de datos de aprendizaje (de principio a fin).

Entrena un clasificador que predice la especie de una flor Iris a partir de sus
medidas. Cubre: cargar datos, dividir train/test, entrenar, evaluar, predecir y guardar.

Requisitos:
    pip install scikit-learn pandas joblib

Ejecutar:
    python entrenar_modelo.py
"""

import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib


def main():
    # 1. CARGAR y EXPLORAR los datos ------------------------------------------
    iris = load_iris()
    X = pd.DataFrame(iris.data, columns=iris.feature_names)  # features (entradas)
    y = iris.target                                          # target (0,1,2)

    print("=== Exploración de datos ===")
    print(X.head())
    print("Especies:", list(iris.target_names))
    print("Total de ejemplos:", len(X), "\n")

    # 2. DIVIDIR en entrenamiento (80%) y prueba (20%) ------------------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Entrenamiento: {len(X_train)} ejemplos | Prueba: {len(X_test)} ejemplos\n")

    # 3. ENTRENAR el modelo ---------------------------------------------------
    modelo = DecisionTreeClassifier(max_depth=3, random_state=42)
    modelo.fit(X_train, y_train)  # <- aquí el modelo APRENDE

    # 4. EVALUAR --------------------------------------------------------------
    predicciones = modelo.predict(X_test)
    print("=== Evaluación ===")
    print(f"Exactitud (test): {accuracy_score(y_test, predicciones):.2%}")
    print("\nMatriz de confusión:")
    print(confusion_matrix(y_test, predicciones))
    print("\nReporte detallado:")
    print(classification_report(y_test, predicciones, target_names=iris.target_names))

    # Chequeo de overfitting
    print(f"Exactitud en TRAIN: {modelo.score(X_train, y_train):.2%}")
    print(f"Exactitud en TEST:  {modelo.score(X_test, y_test):.2%}\n")

    # 5. PREDECIR sobre una flor nueva ---------------------------------------
    flor_nueva = pd.DataFrame([[5.1, 3.5, 1.4, 0.2]], columns=iris.feature_names)
    pred = modelo.predict(flor_nueva)
    print("=== Predicción sobre una flor nueva ===")
    print("Medidas:", flor_nueva.values.tolist()[0])
    print("Especie predicha:", iris.target_names[pred[0]], "\n")

    # 6. GUARDAR el modelo entrenado -----------------------------------------
    joblib.dump(modelo, "modelo_iris.pkl")
    print("Modelo guardado en 'modelo_iris.pkl' (se puede cargar con joblib.load).")


if __name__ == "__main__":
    main()
