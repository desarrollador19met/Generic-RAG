import { Inject, Injectable } from '@nestjs/common';
import {
  LLM_PROVIDER,
  type LlmPort,
} from "~/modules/5_LLM's/domain/ports/llm-chunking.port";
import type {
  FormattedIngestionChunk,
  sourceType,
} from '~/shared/types/semantic-pipeline.type';

@Injectable()
export class ChunkingService {
  constructor(
    @Inject(LLM_PROVIDER) private readonly chunkingProvider: LlmPort,
  ) { }

  async chunkPDF(input: {
    source: string;
    type: sourceType;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<FormattedIngestionChunk[]> {
    const chunks = this.chunkByParagraphs(input.content, 1400, 200);

    return chunks.map((content, index) => ({
      source: input.source,
      content,
      metadata: {
        type: input.type,
        chunkIndex: index,
        provider: this.chunkingProvider.providerName,
        chunkingStrategy: 'pdf-paragraph-window',
        ...input.metadata,
      },
    }));
  }

  async chunkText(input: {
    source: string;
    type: sourceType;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<FormattedIngestionChunk[]> {
    const chunks = this.chunkByParagraphs(input.content, 1000, 150);

    return chunks.map((content, index) => ({
      source: input.source,
      content,
      metadata: {
        type: input.type,
        chunkIndex: index,
        provider: this.chunkingProvider.providerName,
        chunkingStrategy: 'text-paragraph-window',
        ...input.metadata,
      },
    }));
  }

  async chunkCustom(input: {
    source: string;
    type: sourceType;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<FormattedIngestionChunk[]> {
    const chunks = this.chunkStructuredContent(input.content, 1200, 120);

    return chunks.map((content, index) => ({
      source: input.source,
      content,
      metadata: {
        type: input.type,
        chunkIndex: index,
        provider: this.chunkingProvider.providerName,
        chunkingStrategy: 'structured-record-window',
        ...input.metadata,
      },
    }));
  }

  private chunkStructuredContent(
    content: string,
    maxLength: number,
    overlap: number,
  ): string[] {
    const lines = content
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    return this.buildSlidingWindows(lines, maxLength, overlap);
  }

  private chunkByParagraphs(
    content: string,
    maxLength: number,
    overlap: number,
  ): string[] {
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
      .filter((paragraph) => paragraph.length > 0);

    if (paragraphs.length === 0) {
      return this.buildSlidingWindows(
        [content.replace(/\s+/g, ' ').trim()].filter(Boolean),
        maxLength,
        overlap,
      );
    }

    return this.buildSlidingWindows(paragraphs, maxLength, overlap);
  }

  private buildSlidingWindows(
    segments: string[],
    maxLength: number,
    overlap: number,
  ): string[] {
    const chunks: string[] = [];
    let current = '';

    for (const segment of segments) {
      const candidate = current ? `${current}\n\n${segment}` : segment;

      if (candidate.length <= maxLength) {
        current = candidate;
        continue;
      }

      if (current) {
        chunks.push(current);
      }

      if (segment.length <= maxLength) {
        current = segment;
        continue;
      }

      const sliced = this.sliceLargeSegment(segment, maxLength, overlap);
      chunks.push(...sliced.slice(0, -1));
      current = sliced.at(-1) ?? '';
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  private sliceLargeSegment(
    content: string,
    maxLength: number,
    overlap: number,
  ): string[] {
    const normalized = content.replace(/\s+/g, ' ').trim();
    const step = Math.max(maxLength - overlap, 1);
    const chunks: string[] = [];

    for (let start = 0; start < normalized.length; start += step) {
      const chunk = normalized.slice(start, start + maxLength).trim();

      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }
}
