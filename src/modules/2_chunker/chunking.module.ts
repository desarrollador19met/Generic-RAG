import { Module } from '@nestjs/common';
import { LlmsModule } from "~/modules/5_LLM's/llms.module";
import { ChunkingService } from './application/chunking.service';

@Module({
  imports: [LlmsModule],
  providers: [ChunkingService],
  exports: [ChunkingService],
})
export class ChunkingModule { }
