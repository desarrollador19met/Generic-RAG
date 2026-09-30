import { Inject, Injectable } from '@nestjs/common';
import { EmbeddingService } from '../../4_embedding/application/embedding.service';
import { StorageService } from '../../7_storage/application/services/storage.service';
import type {
  EmbeddedDocumentChunk,
  IngestionResult,
  sourceType,
} from '~/shared/types/semantic-pipeline.type';
import {
  INGESTION_ADAPTERS,
  type IngestionFormatPort,
  type IngestionFormatInput,
} from './ports/ingestion-format.port';
import { LoggerService } from '~/shared/logging/main.logger';


@Injectable()
export class DocumentIngestionService {
  private readonly logger = new LoggerService('IngestionController');
  constructor(
    @Inject(INGESTION_ADAPTERS) private readonly formatAdapters: IngestionFormatPort[],
    private readonly embedding: EmbeddingService,
    private readonly storage: StorageService,
  ) { }

  private getAdapter(type: sourceType): IngestionFormatPort {
    const adapter = this.formatAdapters.find(
      (candidate) => candidate.type === type,
    );

    if (!adapter) throw new Error(`No ingestion adapter registered for type: ${type}`);

    return adapter;
  }

  public async ingest(
    type: sourceType,
    input: IngestionFormatInput,
  ): Promise<IngestionResult> {
    const initialTime = new Date();
    this.logger.log(`Initializing ingestion process for ${type} source ${input.source}`);
    const adapter = this.getAdapter(type);
    const chunks = await adapter.format(input);
    const endtime = new Date();
    this.logger.log(`Formatting process completed in ${endtime.getTime() - initialTime.getTime()} ms`);
    this.logger.log(`Initializing embedding process of ${chunks.length} chunks for ${type} document`);
    const embeddedChunks = await Promise.all(
      chunks.map<Promise<EmbeddedDocumentChunk>>(async (chunk) => ({
        ...chunk,
        embedding: await this.embedding.embed(chunk.content),
      })),
    );
    this.logger.log(`Embedding process completed in ${new Date().getTime() - endtime.getTime()} ms`);
    this.logger.log(`Initializing storing process of ${embeddedChunks.length} chunks for ${type} document`);
    const stored = await this.storage.storeDocumentChunks(embeddedChunks);
    this.logger.log(`Storing process completed in ${new Date().getTime() - endtime.getTime()} ms`);
    this.logger.log(`Ingesting process completed for ${type} document with ${embeddedChunks.length} chunks`);
    return {
      source: input.source,
      type,
      chunkCount: embeddedChunks.length,
      embeddedChunks,
      stored,
    };
  }
}
