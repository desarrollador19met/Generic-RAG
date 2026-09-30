import { Inject, Injectable } from '@nestjs/common';
import type { RetrievedContext } from '../../../../shared/types/semantic-pipeline.type';
import { type ChunkingLangChainPort, SEMANTIC_CHUNKING_ADAPTER } from '../ports/semantic_chunk.port';

@Injectable()
export class ChunkingOrchestratorService {
  constructor(
    @Inject(SEMANTIC_CHUNKING_ADAPTER) private readonly graphAdapter: ChunkingLangChainPort,
  ) { }

  chunkPdf(input: string): Promise<string[]> {
    return this.graphAdapter.chunkPdf(input);
  }

  chunkText(input: string): Promise<string[]> {
    return this.graphAdapter.chunkText(input);
  }

  chunkCustom(input: string): Promise<string[]> {
    return this.graphAdapter.chunkCustom(input);
  }
}
