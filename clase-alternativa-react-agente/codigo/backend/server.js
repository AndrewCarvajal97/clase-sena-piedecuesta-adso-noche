// ============================================================
//  server.js — Servidor Express del agente RAG
//  Curso IA SENA Piedecuesta · Clase alternativa
// ------------------------------------------------------------
//  Este backend existe por UNA razón principal: PROTEGER LAS CLAVES.
//  El navegador (React) nunca habla directo con Cohere, Supabase ni
//  Gemini. Todo pasa por aquí, que es el único que conoce el .env.
// ============================================================

import express from "express";
import cors from "cors";
import "dotenv/config"; // carga automáticamente las variables del .env
import { ingestarTexto, responderPregunta } from "./rag.js";

const app = express();

// CORS: permite que el frontend (localhost:5173) llame a este backend.
// Por seguridad, el navegador bloquea llamadas a otro origen si no se autoriza.
app.use(cors());

// Permite leer JSON enviado en el cuerpo (body) de las peticiones.
app.use(express.json());

// ------------------------------------------------------------
//  POST /ingest  → cargar documentos a la base vectorial
//  Body esperado: { "texto": "un texto largo..." }
//  Lo parte en chunks, genera embeddings y los guarda en Supabase.
// ------------------------------------------------------------
app.post("/ingest", async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: "Falta el campo 'texto'." });
    }
    const fragmentos = await ingestarTexto(texto);
    res.json({ ok: true, fragmentos });
  } catch (e) {
    console.error("Error en /ingest:", e);
    res.status(500).json({ error: e.message });
  }
});

// ------------------------------------------------------------
//  POST /chat  → preguntar al agente RAG
//  Body esperado: { "pregunta": "¿A qué hora es el curso?" }
//  Devuelve: { "respuesta": "..." }
// ------------------------------------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { pregunta } = req.body;
    if (!pregunta || !pregunta.trim()) {
      return res.status(400).json({ error: "Falta el campo 'pregunta'." });
    }
    const respuesta = await responderPregunta(pregunta);
    res.json({ respuesta });
  } catch (e) {
    console.error("Error en /chat:", e);
    res.status(500).json({ error: e.message });
  }
});

// Arrancar el servidor.
const PUERTO = process.env.PORT || 3000;
app.listen(PUERTO, () => {
  console.log(`Backend RAG escuchando en http://localhost:${PUERTO}`);
});
