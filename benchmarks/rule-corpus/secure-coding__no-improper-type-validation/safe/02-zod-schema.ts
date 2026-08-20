/**
 * SAFE - Schema validation at the boundary. `safeParse` narrows the runtime type
 * as well as the static one, so nothing downstream has to guess.
 */
import { z } from 'zod';
import type { Request, Response } from 'express';
import { Order } from '../models/order';

const ListOrdersQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100),
  status: z.enum(['open', 'shipped', 'cancelled']),
});

export async function listOrders(req: Request, res: Response): Promise<void> {
  const parsed = ListOrdersQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const orders = await Order.find({ status: parsed.data.status }).limit(parsed.data.limit);
  res.json(orders);
}
