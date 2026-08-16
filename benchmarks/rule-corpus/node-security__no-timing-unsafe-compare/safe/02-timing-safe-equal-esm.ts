/**
 * SAFE - the remediation for 01/14, as a named `node:crypto` import in
 * TypeScript, with the `as string` cast on the header read.
 */
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const API_KEY = Buffer.from(process.env.API_KEY as string, 'utf8');

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const provided = Buffer.from((req.header('x-api-key') ?? '') as string, 'utf8');

  if (provided.length !== API_KEY.length || !timingSafeEqual(provided, API_KEY)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  next();
}
