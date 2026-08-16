/**
 * VULNERABLE - TypeScript. Express types `req.query.at` as
 * `string | string[] | ParsedQs | undefined`, so the handler MUST write a cast
 * to compile. The cast is erased; the unvalidated subarray offset is not.
 */
import { Buffer } from 'node:buffer';
import type { Request, Response } from 'express';

const payload = Buffer.alloc(4096);

export function window(req: Request, res: Response): void {
  const at = Number(req.query.at as string);
  const view = payload.subarray(at);
  res.end(view);
}
