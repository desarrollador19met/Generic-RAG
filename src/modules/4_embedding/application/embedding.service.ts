import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GeminiLlmService } from "~/modules/5_LLM's/application/services/gemini-llm.service";
import type { EmbeddingVector } from '../domain/types/embedding-vector.type';

@Injectable()
export class EmbeddingService {
  constructor(private readonly gemini: GeminiLlmService) { }

  async embed(input: string): Promise<EmbeddingVector> {
    const embedding = await this.gemini.embedText(input);

    if (!embedding || embedding.length === 0) {
      throw new InternalServerErrorException('Embedding provider returned an empty vector');
    }

    return embedding;
  }
}
