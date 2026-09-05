# AGENTS.md — Ejemplo comentado para el curso

> Este es un archivo de EJEMPLO. Cópialo a la raíz de tu proyecto y adáptalo.
> OpenCode lo lee automáticamente en cada sesión y sigue estas reglas.
> Puedes generarlo automáticamente ejecutando el comando /init dentro de OpenCode.

## Descripción del proyecto

Aplicación web sencilla de lista de tareas ("To-Do") hecha con Python (Flask) en el
backend y HTML + CSS + JavaScript en el frontend. Es un proyecto educativo del curso
de IA del SENA Piedecuesta.

## Tecnologías

- Lenguaje: Python 3.11+
- Framework web: Flask
- Frontend: HTML5, CSS3 y JavaScript sin frameworks
- Base de datos: SQLite (archivo local `tareas.db`)

## Estructura de carpetas

- `app.py` — punto de entrada de la aplicación Flask.
- `templates/` — plantillas HTML.
- `static/` — CSS y JavaScript.
- `tests/` — pruebas automáticas.

## Cómo ejecutar y probar

- Instalar dependencias: `pip install -r requirements.txt`
- Correr la app: `python app.py` (abre en http://localhost:5000)
- Correr las pruebas: `pytest`

## Convenciones de código (reglas para el asistente)

- Escribe el código y los comentarios **en español**.
- Usa nombres de variables descriptivos (por ejemplo, `lista_tareas`, no `lt`).
- Sigue el estilo PEP 8 en Python.
- Cada función debe llevar un docstring corto que explique qué hace.
- No agregues librerías nuevas sin avisar primero.
- Antes de borrar o reescribir un archivo completo, muéstrame el plan.

## Qué evitar

- No subas el archivo `.env` ni claves de API a Git.
- No uses `eval()` con datos del usuario.
- No cambies la estructura de carpetas sin explicarlo.
