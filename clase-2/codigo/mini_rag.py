"""
Clase 2 — Mini-RAG: buscar el fragmento (chunk) más relevante para una pregunta.

Muestra la idea central de RAG sin base de datos: vectorizamos unos "chunks",
vectorizamos la pregunta y buscamos el más parecido por similitud coseno.

Requisitos:
    pip install cohere numpy python-dotenv
    Un archivo .env (en la raíz del repo) con:  COHERE_API_KEY=tu_clave

Ejecutar:
    python mini_rag.py
"""

import os
import cohere
import numpy as np
from dotenv import load_dotenv

load_dotenv()
co = cohere.Client(os.getenv("COHERE_API_KEY"))

# 1. Nuestros "documentos" ya partidos en chunks
chunks = [
    "El horario de atención del SENA es de lunes a viernes de 7am a 5pm.",
    "El curso de IA se dicta los sábados de 8am a 12m en Piedecuesta.",
    "Para certificarse se requiere el 80% de asistencia.",
]

# 2. Vectorizamos los chunks (base de conocimiento)
emb_chunks = co.embed(
    texts=chunks,
    model="embed-multilingual-v3.0",
    input_type="search_document",
).embeddings


def similitud(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# 3. Pregunta del usuario
pregunta = "¿A qué hora es la clase de inteligencia artificial?"
emb_preg = co.embed(
    texts=[pregunta],
    model="embed-multilingual-v3.0",
    input_type="search_query",
).embeddings[0]

# 4. Buscamos el chunk más cercano
puntajes = [similitud(emb_preg, e) for e in emb_chunks]
mejor = int(np.argmax(puntajes))

print("Pregunta:", pregunta)
print("Chunk más relevante:", chunks[mejor])
