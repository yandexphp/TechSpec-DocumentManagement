import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class DocumentsTimeoutMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    req.setTimeout(0);
    res.setTimeout(0);
    next();
  }
}
