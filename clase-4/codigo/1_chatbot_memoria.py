"""
Clase 4 — Proyecto 1: Chatbot con MEMORIA de conversación (Gemini).

Un modelo por defecto no recuerda mensajes anteriores. Aquí usamos start_chat(),
que mantiene el historial y se lo reenvía al modelo en cada turno = memoria.

Requisitos:
    pip install google-generativeai python-dotenv
    Un archivo .env con:  GEMINI_API_KEY=tu_clave

Ejecutar:
    python 1_chatbot_memoria.py
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

modelo = genai.GenerativeModel(
    "gemini-1.5-flash",
    # El system_instruction define la personalidad y las reglas del agente.
    system_instruction=(
        "Eres un tutor amable del SENA. Respondes de forma clara y breve, "
        "con ejemplos sencillos y en español."
    ),
)

# start_chat mantiene automáticamente el historial => MEMORIA.
chat = modelo.start_chat(history=[])


def main():
    print("Tutor IA listo 🧠 (escribe 'salir' para terminar)\n")
    while True:
        mensaje = input("Tú: ").strip()
        if mensaje.lower() in ("salir", "exit", "quit"):
            print("¡Hasta la próxima!")
            break
        if not mensaje:
            continue
        try:
            respuesta = chat.send_message(mensaje)
            print("Tutor:", respuesta.text, "\n")
        except Exception as e:
            print("Error al contactar el modelo:", e, "\n")


if __name__ == "__main__":
    main()
