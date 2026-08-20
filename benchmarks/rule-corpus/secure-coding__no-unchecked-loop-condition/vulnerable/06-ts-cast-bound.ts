/**
 * VULNERABLE (TypeScript) - The identical unbounded loop, written in the
 * dialect TypeScript users are forced into. Express types `req.query.count` as
 * `string | string[] | ParsedQs | undefined`, so it cannot be compared to a
 * number without a cast. The cast is erased at compile time.
 */
import type { Request, Response } from 'express';

export function buildBatches(req: Request, res: Response): void {
  const batches: number[] = [];
  for (let index = 0; index < (req.query.count as unknown as number); index++) {
    batches.push(index);
  }
  res.json(batches);
}
