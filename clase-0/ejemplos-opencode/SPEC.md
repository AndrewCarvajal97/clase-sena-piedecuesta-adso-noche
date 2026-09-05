# SPEC.md — Especificación del proyecto (ejemplo)

> Un archivo SPEC.md describe QUÉ quieres construir, con detalle, ANTES de programar.
> No es una función oficial de OpenCode: es una buena práctica. Se lo entregas al
> asistente (por ejemplo: "Lee @SPEC.md y créame el proyecto en modo Plan") para que
> tenga claro el objetivo y no se invente cosas.

## 1. Objetivo

Construir una aplicación web de **lista de tareas** donde el usuario pueda agregar,
marcar como completadas y borrar tareas. Los datos deben guardarse aunque se cierre
el navegador.

## 2. Usuarios

Estudiantes que quieren organizar sus pendientes del curso.

## 3. Funcionalidades (qué debe hacer)

1. **Agregar tarea**: un campo de texto y un botón "Agregar".
2. **Ver tareas**: lista con todas las tareas pendientes y completadas.
3. **Completar tarea**: una casilla que marca la tarea como hecha (se ve tachada).
4. **Borrar tarea**: un botón para eliminar una tarea.
5. **Persistencia**: las tareas se guardan en una base de datos SQLite.

## 4. Fuera de alcance (qué NO haremos por ahora)

- Cuentas de usuario ni inicio de sesión.
- Fechas límite ni recordatorios.
- Aplicación móvil.

## 5. Requisitos técnicos

- Backend en Python con Flask.
- Frontend en HTML, CSS y JavaScript simples.
- Base de datos SQLite (`tareas.db`).
- Debe correr con `python app.py` en http://localhost:5000

## 6. Criterios de aceptación (cómo sé que quedó bien)

- [ ] Puedo agregar una tarea y aparece en la lista.
- [ ] Puedo marcarla como completada y se ve tachada.
- [ ] Puedo borrarla y desaparece.
- [ ] Si cierro y vuelvo a abrir, las tareas siguen ahí.
- [ ] La página se ve ordenada en el celular y en el computador.

## 7. Pasos sugeridos (tareas agrupadas)

1. Crear la estructura del proyecto y `requirements.txt`.
2. Crear la base de datos y la tabla de tareas.
3. Crear las rutas de Flask (agregar, listar, completar, borrar).
4. Crear la interfaz HTML/CSS.
5. Conectar el frontend con el backend (JavaScript).
6. Probar todos los criterios de aceptación.
