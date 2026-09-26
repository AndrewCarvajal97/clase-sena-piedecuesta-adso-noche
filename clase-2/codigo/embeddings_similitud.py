"""
Clase 2 — Embeddings y similitud semántica (vectorización) con Cohere.

Convierte palabras en vectores (embeddings) y mide qué tan parecido es su
SIGNIFICADO con la similitud coseno.

Requisitos:
    pip install cohere numpy python-dotenv
    Un archivo .env (en la raíz del repo) con:  COHERE_API_KEY=tu_clave

Ejecutar:
    python embeddings_similitud.py
"""

import os
import cohere
import numpy as np
from dotenv import load_dotenv

load_dotenv()
co = cohere.Client(os.getenv("COHERE_API_KEY"))

textos = ["perro", "gato", "avión", "cachorro"]

# Cada texto se convierte en un vector de números (su "significado")
vectores = co.embed(
    texts=textos,
    model="embed-multilingual-v3.0",
    input_type="search_document",
).embeddings

print("Dimensiones del vector de 'perro':", len(vectores[0]))


def similitud(a, b):
    """Similitud coseno: 1 = idénticos, cerca de 0 = sin relación."""
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


print("perro vs gato:    ", round(similitud(vectores[0], vectores[1]), 3))
print("perro vs cachorro:", round(similitud(vectores[0], vectores[3]), 3))
print("perro vs avión:   ", round(similitud(vectores[0], vectores[2]), 3))
