import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../../../4_embedding/application/embedding.service';
import { StorageService } from '../../../7_storage/application/services/storage.service';
import type { RetrievedContext } from '../../../../shared/types/semantic-pipeline.type';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly storage: StorageService,
    private readonly embedding: EmbeddingService,
  ) { }

  async retrieve(question: string, limit: number): Promise<RetrievedContext[]> {
    const queryEmbedding = await this.embedding.embed(question);
    return this.storage.searchSimilarContexts(queryEmbedding, limit);
  }
}
