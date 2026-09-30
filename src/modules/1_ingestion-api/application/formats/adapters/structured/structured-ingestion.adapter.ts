import { Injectable } from '@nestjs/common';
import { ChunkingService } from '~/modules/2_chunker/application/chunking.service';
import type {
  IngestionFormatPort,
  IngestionFormatInput,
} from '~/modules/1_ingestion-api/application/ports/ingestion-format.port';
import { CustomJsonNoFormattedError } from '~/modules/1_ingestion-api/domain/errors/domain_errors';
import { LoggerService } from '~/shared/logging/main.logger';
import {
  FormattedIngestionChunk,
  sourceType,
} from '~/shared/types/semantic-pipeline.type';

@Injectable()
export class StructuredIngestionAdapter implements IngestionFormatPort {
  readonly type = sourceType.Structured;
  private readonly logger = new LoggerService(StructuredIngestionAdapter.name);

  constructor(private readonly chunker: ChunkingService) { }

  async format(
    input: IngestionFormatInput,
  ): Promise<FormattedIngestionChunk[]> {
    const serialized = typeof input.data === 'string'
      ? this.normalizeStructuredString(input.data)
      : JSON.stringify(input.data ?? {}, null, 2);
    const chunksProcessed = await this.chunker.chunkCustom({
      source: input.source,
      type: this.type,
      content: serialized,
      metadata: {
        recordFormat: Array.isArray(input.data)
          ? 'array'
          : typeof input.data === 'string'
            ? 'string'
            : 'object',
      },
    });

    if (chunksProcessed.length === 0)
      throw new CustomJsonNoFormattedError(
        `No formatted chunks were generated from the structured source ${input.source}`,
        input.source,
      );

    this.logger.log(
      `Processed ${chunksProcessed.length} chunks from structured source ${input.source}`,
    );
    return chunksProcessed;
  }

  private normalizeStructuredString(input: string): string {
    try {
      return JSON.stringify(JSON.parse(input), null, 2);
    } catch {
      return input;
    }
  }
}
