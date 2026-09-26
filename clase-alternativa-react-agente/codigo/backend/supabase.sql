-- ============================================================
--  supabase.sql — Configuración de la base de datos vectorial
--  Curso IA SENA Piedecuesta · Clase alternativa
-- ------------------------------------------------------------
--  Cómo usarlo:
--    1. Entra a tu proyecto en https://supabase.com
--    2. Abre el "SQL Editor"
--    3. Pega TODO este archivo y ejecútalo (botón "Run")
--
--  1024 = dimensión de los embeddings de embed-multilingual-v3.0 (Cohere)
-- ============================================================

-- 1. Habilitar la extensión de vectores (pgvector).
create extension if not exists vector;

-- 2. Tabla donde guardamos cada fragmento de texto y su embedding.
create table if not exists documentos (
  id        bigserial primary key,
  contenido text,
  embedding vector(1024)
);

-- 3. Función de búsqueda por similitud (coseno).
--    Recibe el embedding de la pregunta y devuelve los documentos
--    más parecidos. El operador <=> es la distancia coseno de pgvector:
--    a menor distancia, más parecido. Por eso similitud = 1 - distancia.
create or replace function match_documents(
  query_embedding vector(1024),
  match_count int default 3
)
returns table (
  id        bigint,
  contenido text,
  similitud float
)
language sql stable
as $$
  select
    id,
    contenido,
    1 - (embedding <=> query_embedding) as similitud
  from documentos
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- (Opcional) Índice para acelerar la búsqueda cuando haya muchos documentos.
-- create index on documentos
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);
