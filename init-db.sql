-- Initialize pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
	id BIGSERIAL PRIMARY KEY,
	source TEXT NOT NULL,
	content TEXT NOT NULL,
	embedding VECTOR(768) NOT NULL,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_documents_source_idx
	ON rag_documents (source);

CREATE INDEX IF NOT EXISTS rag_documents_metadata_gin_idx
	ON rag_documents USING gin (metadata);

CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
	ON rag_documents USING ivfflat (embedding vector_cosine_ops)
	WITH (lists = 100);
