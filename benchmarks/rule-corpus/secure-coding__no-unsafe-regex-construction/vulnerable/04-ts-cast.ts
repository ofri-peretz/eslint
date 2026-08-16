/**
 * VULNERABLE - Express types `req.query.term` as
 * `string | string[] | ParsedQs | undefined`, so a TypeScript handler CANNOT
 * pass it to `new RegExp` without the cast. The cast is erased at compile time
 * and changes nothing about what reaches the engine.
 */
import type { Request, Response } from 'express';
import { auditLog } from '../lib/audit';

export function highlight(req: Request, res: Response): void {
  const term = new RegExp(req.query.term as string, 'gi');
  auditLog('highlight', term.source);
  res.json({ pattern: term.source });
}
