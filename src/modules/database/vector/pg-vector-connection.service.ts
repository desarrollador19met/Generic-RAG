import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import type {
  EmbeddedDocumentChunk,
  RetrievedContext,
} from '../../../shared/types/semantic-pipeline.type';

@Injectable()
export class PgVectorConnectionService implements OnModuleDestroy, OnModuleInit {
  private readonly pool?: Pool;

  constructor() {
    const connectionString = process.env.RAG_VECTOR_DATABASE_URL;

    if (connectionString) {
      this.pool = new Pool({ connectionString });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.pool);
  }

  async onModuleInit(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.query('create extension if not exists vector');
    await this.pool.query(`
      create table if not exists rag_documents (
        id bigserial primary key,
        source text not null,
        content text not null,
        embedding vector(768) not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `);
    await this.pool.query(
      'create index if not exists rag_documents_source_idx on rag_documents (source)',
    );
    await this.pool.query(
      'create index if not exists rag_documents_metadata_gin_idx on rag_documents using gin (metadata)',
    );
    await this.pool.query(
      'create index if not exists rag_documents_embedding_idx on rag_documents using ivfflat (embedding vector_cosine_ops) with (lists = 100)',
    );
  }

  async searchSimilarContexts(
    queryEmbedding: number[],
    limit: number,
  ): Promise<RetrievedContext[]> {
    if (!this.pool) {
      return [];
    }

    const result = await this.pool.query(
      `
        select
          id::text,
          source,
          content,
          metadata,
          1 - (embedding <=> $1::vector) as score
        from rag_documents
        order by embedding <=> $1::vector asc
        limit $2
      `,
      [this.toVectorLiteral(queryEmbedding), limit],
    );

    return result.rows as RetrievedContext[];
  }

  async storeDocumentChunks(chunks: EmbeddedDocumentChunk[]): Promise<boolean> {
    if (!this.pool || chunks.length === 0) {
      return false;
    }

    // MVP schema expectation: rag_documents(source, content, embedding vector).
    // Add metadata columns next for PDF page numbers and structured field paths.
    for (const chunk of chunks) {
      await this.pool.query(
        `
          insert into rag_documents (source, content, embedding, metadata)
          values ($1, $2, $3::vector, $4::jsonb)
        `,
        [
          chunk.source,
          chunk.content,
          this.toVectorLiteral(chunk.embedding),
          JSON.stringify(chunk.metadata ?? {}),
        ],
      );
    }

    return true;
  }

  private toVectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
