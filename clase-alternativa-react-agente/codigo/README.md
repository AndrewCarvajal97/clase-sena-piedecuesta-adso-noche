# App React + Agente RAG — Código de ejemplo

Curso de Inteligencia Artificial · SENA Piedecuesta · Clase alternativa (avanzada)

Chat en **React** que responde usando **nuestros propios documentos** (RAG), con las claves protegidas en un **backend Express**.

```
React (navegador) ── pregunta ──▶ Backend Express ──▶ Cohere (embeddings)
                  ◀─ respuesta ──       │           ──▶ Supabase (pgvector)
                                        └───────────▶ Gemini (genera texto)
```

## Estructura

```
codigo/
├── backend/
│   ├── server.js        # endpoints /ingest y /chat
│   ├── rag.js           # chunking + embeddings + búsqueda + Gemini
│   ├── supabase.sql     # crea la tabla y la función de búsqueda
│   ├── .env.example     # plantilla de claves (cópiala a .env)
│   └── package.json
└── frontend/
    ├── App.jsx          # componente de chat (va en src/App.jsx)
    └── App.css          # estilos (va en src/App.css)
```

> Nota: los nombres de modelos/SDK y los planes gratuitos pueden cambiar. Si algo falla, revisa la documentación oficial de Cohere, Google AI Studio y Supabase.

---

## Paso 1 · Configurar Supabase (base vectorial)

1. Crea una cuenta y un proyecto en https://supabase.com
2. Abre el **SQL Editor** y ejecuta todo el archivo `backend/supabase.sql`.
3. En **Project Settings → API** copia la **Project URL** y la clave **service_role**.

## Paso 2 · Backend (Express)

```bash
cd backend
npm install
cp .env.example .env      # en Windows PowerShell: copy .env.example .env
# edita .env y pega tus claves reales (Cohere, Gemini, Supabase)
npm start                 # arranca en http://localhost:3000
```

## Paso 3 · Cargar documentos (ingesta)

Con el backend corriendo, envía un texto al endpoint `/ingest`. Ejemplo con `curl`:

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d "{\"texto\": \"El curso de IA del SENA Piedecuesta es los sabados de 8am a 12m. El instructor es Andres Carvajal. Se requiere 80% de asistencia para certificarse.\"}"
```

También puedes usar Thunder Client / Postman / la extensión REST Client de VS Code.

## Paso 4 · Frontend (React + Vite)

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
# copia App.jsx y App.css de este repo dentro de frontend/src/
npm run dev               # abre http://localhost:5173
```

Escribe una pregunta en el chat (por ejemplo, "¿A qué hora es el curso?") y el
agente responderá usando solo los documentos que cargaste.

---

## Claves necesarias (todas gratuitas)

| Variable          | Dónde se obtiene                                  |
|-------------------|--------------------------------------------------|
| `COHERE_API_KEY`  | https://dashboard.cohere.com/                    |
| `GEMINI_API_KEY`  | https://aistudio.google.com/                     |
| `SUPABASE_URL`    | Supabase → Project Settings → API (Project URL)  |
| `SUPABASE_KEY`    | Supabase → Project Settings → API (service_role) |

## Seguridad

- Las claves van **solo** en `backend/.env`, **nunca** en React.
- Crea un `.gitignore` con `node_modules/` y `.env` para no subir secretos.
- Si una clave se filtra, revócala y genera otra desde el panel del proveedor.

## Despliegue (opcional)

- **Frontend** (React) → Vercel o Netlify.
- **Backend** (Express) → Render o Railway (configura las claves como variables de entorno).
- **Base vectorial** → Supabase ya está en la nube.
- Al desplegar, cambia `const API = "http://localhost:3000"` en `App.jsx` por la URL pública del backend.
