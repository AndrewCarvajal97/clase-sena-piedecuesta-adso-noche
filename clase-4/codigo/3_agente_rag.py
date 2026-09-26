"""
Clase 4 — Proyecto 3: Agente RAG (responde con NUESTROS documentos) usando Cohere.

RAG = Retrieval-Augmented Generation:
  1) vectorizamos nuestros documentos (embeddings),
  2) ante una pregunta, buscamos los fragmentos más parecidos,
  3) el LLM responde usando SOLO esos fragmentos (reduce alucinaciones).

Requisitos:
    pip install cohere numpy python-dotenv
    Un archivo .env con:  COHERE_API_KEY=tu_clave

Ejecutar:
    python 3_agente_rag.py
"""

import os
import cohere
import numpy as np
from dotenv import load_dotenv

load_dotenv()
co = cohere.Client(os.getenv("COHERE_API_KEY"))

# --- 1. Base de conocimiento: chunks de nuestros documentos ------------------
documentos = [
    "El curso de IA del SENA Piedecuesta se dicta los sábados de 8am a 12m.",
    "Se requiere el 80% de asistencia para poder certificarse en el curso.",
    "El instructor del curso es Andrés Carvajal.",
    "Las APIs usadas en el curso son Cohere y Gemini, ambas con planes gratuitos.",
    "El curso tiene 5 clases: una de configuración (Clase 0) y cuatro temáticas.",
]

# --- 2. Vectorizamos la base UNA sola vez ------------------------------------
emb_docs = co.embed(
    texts=documentos,
    model="embed-multilingual-v3.0",
    input_type="search_document",
).embeddings


def similitud(a, b):
    """Similitud coseno entre dos vectores (1 = idénticos, 0 = sin relación)."""
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def responder(pregunta: str, k: int = 2) -> str:
    # 3. RETRIEVAL: buscar los k chunks más relevantes para la pregunta.
    emb_p = co.embed(
        texts=[pregunta],
        model="embed-multilingual-v3.0",
        input_type="search_query",
    ).embeddings[0]

    ranking = sorted(
        range(len(documentos)),
        key=lambda i: similitud(emb_p, emb_docs[i]),
        reverse=True,
    )
    contexto = "\n".join(f"- {documentos[i]}" for i in ranking[:k])

    # 4. GENERATION: el LLM responde usando SOLO el contexto recuperado.
    prompt = (
        "Responde la pregunta usando ÚNICAMENTE la siguiente información.\n"
        "Si la respuesta no está ahí, di claramente que no tienes ese dato.\n\n"
        f"Información:\n{contexto}\n\n"
        f"Pregunta: {pregunta}"
    )
    return co.chat(message=prompt, model="command-r").text


def main():
    for pregunta in [
        "¿A qué hora es el curso de IA?",
        "¿Quién es el instructor?",
        "¿Cuántas clases tiene el curso?",
        "¿Cuánto cuesta un carro nuevo?",  # no está en los documentos
    ]:
        print("Pregunta:", pregunta)
        print("Agente RAG:", responder(pregunta), "\n")


if __name__ == "__main__":
    main()
