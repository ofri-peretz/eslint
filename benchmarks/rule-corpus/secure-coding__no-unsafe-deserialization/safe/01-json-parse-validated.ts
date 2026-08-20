/**
 * SAFE - The remediation this rule's own message recommends. `JSON.parse` cannot
 * invoke a constructor or execute code, and the result is schema-checked before
 * anything reads it.
 */
import { z } from 'zod';
import type { Request, Response } from 'express';

const CheckoutSchema = z.object({ sku: z.string(), quantity: z.number().int().positive() });

export function checkout(req: Request, res: Response): void {
  const order = CheckoutSchema.parse(JSON.parse(req.body.order as string));
  res.json({ total: order.quantity });
}
