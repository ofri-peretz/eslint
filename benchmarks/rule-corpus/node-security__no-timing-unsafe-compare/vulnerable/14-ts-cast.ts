/**
 * VULNERABLE - TypeScript handler, with the `as string` cast an Express typed
 * header read requires to compile.
 *
 * `req.header()` is typed `string | undefined`, so the cast is not stylistic -
 * a TS codebase MUST write something like it, and a taint reader that does not
 * see through the cast goes blind on every TypeScript Express service.
 */
import type { Request, Response, NextFunction } from 'express';
import { createHmac } from 'node:crypto';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET as string;

export function verify(req: Request, res: Response, next: NextFunction): void {
  const signature = req.header('x-signature') as string;
  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body as string)
    .digest('hex');

  if (signature !== expectedSignature) {
    res.status(401).send('bad signature');
    return;
  }

  next();
}
