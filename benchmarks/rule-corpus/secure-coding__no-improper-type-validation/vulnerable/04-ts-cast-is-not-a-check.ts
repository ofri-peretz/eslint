/**
 * VULNERABLE - A TypeScript `as string` cast is an assertion to the COMPILER and
 * nothing at all at runtime. `?limit[$gt]=` still arrives as an object, and
 * `parseInt(object)` yields NaN, which Prisma reads as "no limit" - a full-table
 * read from an endpoint that advertises a page size.
 */
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function listOrders(req: Request, res: Response): Promise<void> {
  const limit = req.query.limit as string;
  const orders = await prisma.order.findMany({ take: parseInt(limit, 10) });
  res.json(orders);
}
