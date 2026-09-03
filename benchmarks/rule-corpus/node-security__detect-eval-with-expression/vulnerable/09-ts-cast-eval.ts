/**
 * VULNERABLE - TypeScript route. `req.body.formula` is loosely enough typed
 * that the cast is written to satisfy the compiler; the cast is erased and the
 * string is still evaluated as code.
 */
import type { Request, Response } from 'express';

export function priceRule(req: Request, res: Response): void {
  const formula = req.body.formula as string;
  const price = eval(formula) as number;
  res.json({ price });
}
