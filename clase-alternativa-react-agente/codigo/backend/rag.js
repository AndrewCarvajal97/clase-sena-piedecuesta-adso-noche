// ============================================================
//  rag.js — El cerebro del agente RAG
//  Curso IA SENA Piedecuesta · Clase alternativa
// ------------------------------------------------------------
//  Aquí viven las 4 funciones clave del RAG:
//    1. partirEnChunks  → dividir el texto en fragmentos
//    2. ingestarTexto   → embeddings (Cohere) + guardar (Supabase)
//    3. responderPregunta → retrieval (Supabase) + generación (Gemini)
//  Los embeddings de embed-multilingual-v3.0 tienen 1024 dimensiones,
//  por eso la tabla usa vector(1024).
// ============================================================

import { CohereClient } from "cohere-ai";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Clientes de cada servicio (usan las claves del .env) ---
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // usar la clave service_role, SOLO en el backend
);

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Nombre del modelo de embeddings (revisa la doc oficial, puede cambiar).
const MODELO_EMBEDDING = "embed-multilingual-v3.0";

// ------------------------------------------------------------
//  1. Partir un texto largo en fragmentos (chunks).
//  Fragmentos pequeños = búsquedas más precisas y prompts más cortos.
// ------------------------------------------------------------
function partirEnChunks(texto, tam = 500) {
  const chunks = [];
  for (let i = 0; i < texto.length; i += tam) {
    chunks.push(texto.slice(i, i + tam).trim());
  }
  // Descartamos fragmentos vacíos por si acaso.
  return chunks.filter((c) => c.length > 0);
}

// ------------------------------------------------------------
//  2. INGESTA: chunks → embeddings (Cohere) → guardar (Supabase).
//  Se llama una sola vez (o cada vez que agregas material nuevo).
// ------------------------------------------------------------
export async function ingestarTexto(texto) {
  const chunks = partirEnChunks(texto);

  // input_type "search_document": para textos que se GUARDAN en la base.
  const r = await cohere.embed({
    texts: chunks,
    model: MODELO_EMBEDDING,
    inputType: "search_document",
  });

  // Cada fila = un fragmento de texto + su vector de 1024 números.
  const filas = chunks.map((contenido, i) => ({
    contenido,
    embedding: r.embeddings[i],
  }));

  const { error } = await supabase.from("documentos").insert(filas);
  if (error) throw error;

  return chunks.length; // cuántos fragmentos guardamos
}

// ------------------------------------------------------------
//  3. CONSULTA (el agente RAG): pregunta → embedding → retrieval →
//     armar prompt → Gemini genera → respuesta.
// ------------------------------------------------------------
export async function responderPregunta(pregunta) {
  // (a) Embedding de la PREGUNTA.
  //     input_type "search_query": para textos que son BÚSQUEDAS.
  const e = await cohere.embed({
    texts: [pregunta],
    model: MODELO_EMBEDDING,
    inputType: "search_query",
  });

  // (b) RETRIEVAL: pedirle a Supabase los 3 chunks más parecidos.
  //     Llama a la función SQL match_documents que creamos en supabase.sql.
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: e.embeddings[0],
    match_count: 3,
  });
  if (error) throw error;

  // Unimos los fragmentos recuperados como "contexto".
  const contexto = (data || []).map((d) => `- ${d.contenido}`).join("\n");

  // (c) Armar el prompt: le pedimos responder SOLO con el contexto.
  const prompt = `Responde usando ÚNICAMENTE la siguiente información.
Si la respuesta no está ahí, di claramente que no tienes ese dato.

Información:
${contexto}

Pregunta: ${pregunta}`;

  // (d) GENERATION: Gemini genera la respuesta final.
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
  const out = await model.generateContent(prompt);
  return out.response.text();
}
