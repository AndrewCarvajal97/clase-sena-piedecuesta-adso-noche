"""
Clase 0 — "Hola IA": tu primera petición a un modelo desde Python (Gemini).

Requisitos:
    pip install google-generativeai python-dotenv
    Un archivo .env (en la raíz del repo) con:  GEMINI_API_KEY=tu_clave

Ejecutar:
    python hola_ia.py
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

# Carga las claves guardadas en el archivo .env
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Elegimos un modelo gratuito y rápido
modelo = genai.GenerativeModel("gemini-1.5-flash")

# Nuestra primera pregunta a la IA
respuesta = modelo.generate_content(
    "Explícame en una frase sencilla qué es la inteligencia artificial."
)

print(respuesta.text)
