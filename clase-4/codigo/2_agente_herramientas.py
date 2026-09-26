"""
Clase 4 — Proyecto 2: Agente con HERRAMIENTAS (function calling, Gemini).

Los LLMs son malos en cálculo exacto y no conocen datos en tiempo real. Les damos
funciones de Python como "herramientas"; el modelo DECIDE cuándo llamarlas.

Requisitos:
    pip install google-generativeai python-dotenv
    Un archivo .env con:  GEMINI_API_KEY=tu_clave

Ejecutar:
    python 2_agente_herramientas.py
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


# --- 1. Definimos las herramientas como funciones normales de Python ---------
# El docstring es MUY importante: el modelo lo lee para saber qué hace y cuándo usarla.

def calcular(operacion: str) -> str:
    """Evalúa una operación matemática escrita como texto. Ejemplo: '15 * 23 + 7'."""
    try:
        # Nota: eval() se usa aquí SOLO con fines educativos. En producción use un
        # parser matemático seguro (por ejemplo, la librería 'ast' o 'sympy').
        return str(eval(operacion, {"__builtins__": {}}, {}))
    except Exception:
        return "No pude calcular eso."


def clima(ciudad: str) -> str:
    """Devuelve el clima actual (simulado) de una ciudad dada."""
    datos = {
        "piedecuesta": "24°C, soleado",
        "bucaramanga": "26°C, parcialmente nublado",
        "bogota": "14°C, lluvioso",
    }
    return datos.get(ciudad.lower(), "No tengo datos de esa ciudad.")


# --- 2. Entregamos las herramientas al modelo -------------------------------
modelo = genai.GenerativeModel("gemini-1.5-flash", tools=[calcular, clima])
chat = modelo.start_chat(enable_automatic_function_calling=True)


def main():
    preguntas = [
        "¿Cuánto es 1520 * 34 + 89?",
        "¿Qué clima hace en Piedecuesta?",
        "Suma el resultado anterior con 1000.",
    ]
    for p in preguntas:
        print("Tú:", p)
        try:
            print("Agente:", chat.send_message(p).text, "\n")
        except Exception as e:
            print("Error:", e, "\n")


if __name__ == "__main__":
    main()
