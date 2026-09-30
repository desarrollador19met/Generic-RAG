import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../4_embedding/embedding.module';
import { StorageModule } from '../7_storage/storage.module';
import { RetrievalService } from './application/services/retrieval.service';

@Module({
  imports: [StorageModule, EmbeddingModule],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule { }
