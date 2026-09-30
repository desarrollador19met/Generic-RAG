import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response } from 'express';

import { setTemporaryContext } from './global-context';

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: (error?: Error) => void) {
    const context = setTemporaryContext(request);
    response.setHeader('X-Request-Id', context.traceId);
    next();
  }
}