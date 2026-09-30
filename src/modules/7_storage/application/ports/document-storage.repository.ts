import type {
  EmbeddedDocumentChunk,
  RetrievedContext,
} from '../../../../shared/types/semantic-pipeline.type';

export interface DocumentStorageRepository {
  searchSimilarContexts(
    queryEmbedding: number[],
    limit: number,
  ): Promise<RetrievedContext[]>;

  storeDocumentChunks(chunks: EmbeddedDocumentChunk[]): Promise<boolean>;
}
