/**
 * VULNERABLE - TypeScript handler. `req.headers['content-length']` is typed
 * `string | undefined`, so the size is written with a cast before it reaches
 * the deprecated constructor. The cast is erased at compile time; the
 * uninitialized allocation is not.
 */
import { Buffer } from 'node:buffer';
import type { Request, Response } from 'express';

export function reserve(req: Request, res: Response): void {
  const declared = Number(req.headers['content-length'] as unknown as number);
  const staging = new Buffer(declared as number);
  res.end(staging);
}
