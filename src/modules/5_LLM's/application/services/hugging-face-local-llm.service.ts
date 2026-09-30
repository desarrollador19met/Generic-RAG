import { Injectable, Inject } from '@nestjs/common';

import {
  type ChunkTextInput,
  LlmChunkingProviderName,
  type LlmConfig,
  type LlmPort,
  LLM_PROVIDER_CONFIG,
} from '../../domain/ports/llm-chunking.port';

import { DummyChunking, DummyEmbedding } from '../../utils/DummySplitters';

import type { Tokenizer, TransformersModule } from '../types/local_model_types';

@Injectable()
export class HuggingFaceLocalLlmService implements LlmPort {

  public readonly providerName: LlmChunkingProviderName;
  private tokenizer?: Tokenizer;
  constructor(
    @Inject(LLM_PROVIDER_CONFIG) private readonly config: LlmConfig,
  ) {
    this.providerName = LlmChunkingProviderName.huggingface;
  }

  async chunkText(input: ChunkTextInput): Promise<string[]> {
    const tokenizer = await this.getTokenizer();

    if (!tokenizer) {
      return DummyChunking(input.text, input.maxChunkLength);
    }

    try {
      const maxTokens = Number(process.env['HF_LOCAL_CHUNK_MAX_TOKENS'] ?? 220);
      const overlap = Number(
        process.env['HF_LOCAL_CHUNK_OVERLAP_TOKENS'] ?? 30,
      );
      const tokens = await tokenizer.encode(input.text);
      const chunks: string[] = [];

      for (
        let start = 0;
        start < tokens.length;
        start += Math.max(maxTokens - overlap, 1)
      ) {
        const decoded = await tokenizer.decode(
          tokens.slice(start, start + maxTokens),
        );
        const chunk = decoded.trim();

        if (chunk) {
          chunks.push(chunk);
        }
      }

      return chunks.length
        ? chunks
        : DummyChunking(input.text, input.maxChunkLength);
    } catch {
      return DummyChunking(input.text, input.maxChunkLength);
    }
  }

  async embedText(input: string): Promise<number[]> {
    return DummyEmbedding(input);
  }

  private async getTokenizer(): Promise<Tokenizer | undefined> {
    if (this.tokenizer) {
      return this.tokenizer;
    }

    try {
      const { AutoTokenizer } =
        (await import('@huggingface/transformers')) as TransformersModule;

      this.tokenizer = (await AutoTokenizer.from_pretrained(
        process.env['HUGGINGFACE_LOCAL_MODEL'] ?? 'sentence-transformers/all-MiniLM-L6-v2',
        {
        local_files_only: true,
        },
      )) as Tokenizer;
      return this.tokenizer;
    } catch {
      return undefined;
    }
  }
}
