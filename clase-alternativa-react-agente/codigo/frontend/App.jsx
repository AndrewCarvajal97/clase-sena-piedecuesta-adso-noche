// ============================================================
//  App.jsx — Chat en React que consume el backend RAG
//  Curso IA SENA Piedecuesta · Clase alternativa
// ------------------------------------------------------------
//  Coloca este archivo en:  frontend/src/App.jsx
//  Solo usa useState + fetch: no hacen falta librerías extra.
//  IMPORTANTE: aquí NO hay ninguna clave de API. React es público;
//  las claves viven únicamente en el backend.
// ============================================================

import { useState } from "react";
import "./App.css";

// Dirección del backend. Al desplegar, cámbiala por la URL pública
// (por ejemplo, la que te da Render o Railway).
const API = "http://localhost:3000";

export default function App() {
  const [mensajes, setMensajes] = useState([]); // lista de {rol, texto}
  const [texto, setTexto] = useState(""); // lo que escribe el usuario
  const [cargando, setCargando] = useState(false); // "escribiendo..."

  async function enviar() {
    const pregunta = texto.trim();
    if (!pregunta) return;

    // 1. Mostramos de una vez el mensaje del usuario.
    setMensajes((m) => [...m, { rol: "yo", texto: pregunta }]);
    setTexto("");
    setCargando(true);

    try {
      // 2. Llamamos al backend (endpoint /chat).
      const r = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });
      const data = await r.json();

      // 3. Mostramos la respuesta del agente.
      const respuesta = data.respuesta || data.error || "Sin respuesta.";
      setMensajes((m) => [...m, { rol: "bot", texto: respuesta }]);
    } catch (e) {
      setMensajes((m) => [
        ...m,
        { rol: "bot", texto: "Error de conexión: " + e.message },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="chat">
      <h1>Asistente RAG del SENA</h1>

      <div className="mensajes">
        {mensajes.length === 0 && (
          <p className="vacio">Hazme una pregunta sobre los documentos cargados.</p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`msg ${m.rol}`}>
            {m.texto}
          </div>
        ))}
        {cargando && <div className="msg bot">escribiendo…</div>}
      </div>

      <div className="fila">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escribe tu pregunta..."
        />
        <button onClick={enviar} disabled={cargando}>
          Enviar
        </button>
      </div>
    </div>
  );
}
