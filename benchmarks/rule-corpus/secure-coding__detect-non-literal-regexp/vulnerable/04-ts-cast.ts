/**
 * TypeScript `as string` cast on a request body field.
 *
 * The cast is the developer telling the compiler "trust me". It changes nothing
 * about provenance: the value still arrives over HTTP. A rule that stops at
 * `TSAsExpression` and never unwraps it reports nothing here.
 */
import type { Request, Response } from 'express';

import { auditLog } from '../lib/audit-log';

export async function filterAuditEntries(req: Request, res: Response): Promise<void> {
  const filter = req.body.filter as string;
  const expression = new RegExp(filter);

  const entries = await auditLog.recent(500);
  res.json(entries.filter((entry) => expression.test(entry.action)));
}
