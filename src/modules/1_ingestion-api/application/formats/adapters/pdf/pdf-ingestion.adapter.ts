import { Injectable } from '@nestjs/common';
import pdf from 'pdf-parse';
import { ChunkingService } from '~/modules/2_chunker/application/chunking.service';
import type {
  IngestionFormatPort,
  IngestionFormatInput,
} from '~/modules/1_ingestion-api/application/ports/ingestion-format.port';
import {
  FormattedIngestionChunk,
  sourceType,
} from '~/shared/types/semantic-pipeline.type';
import { LoggerService } from '~/shared/logging/main.logger';
import { PDFNoFormattedError } from '~/modules/1_ingestion-api/domain/errors/domain_errors';

@Injectable()
export class PdfIngestionAdapter implements IngestionFormatPort {
  readonly type = sourceType.Pdf;
  private readonly logger = new LoggerService(PdfIngestionAdapter.name);

  constructor(private readonly chunker: ChunkingService) { }

  async format(
    input: IngestionFormatInput,
  ): Promise<FormattedIngestionChunk[]> {
    const extractedText = await this.extractReadableText(input);
    const chunksProcessed = await this.chunker.chunkPDF({
      source: input.source,
      type: this.type,
      content: extractedText,
      metadata: {
        fileName: input.file?.originalname,
        mimeType: input.file?.mimetype,
      },
    });

    if (chunksProcessed.length === 0)
      throw new PDFNoFormattedError(
        `No readable text could be extracted from the PDF file ${input.file?.originalname ?? input.source}`,
        input.source,
      );

    this.logger.log(
      `Processed ${chunksProcessed.length} chunks from PDF file ${input.file?.originalname ?? input.source}`,
    );
    return chunksProcessed;
  }

  private async extractReadableText(input: IngestionFormatInput): Promise<string> {
    if (!input.file?.buffer) {
      return '';
    }

    const parsed = await pdf(input.file.buffer);
    const sanitizedText = parsed.text
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return sanitizedText;
  }
}
