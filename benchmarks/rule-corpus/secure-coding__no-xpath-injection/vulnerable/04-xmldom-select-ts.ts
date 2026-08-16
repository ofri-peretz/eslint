/**
 * VULNERABLE - `@xmldom/xmldom` + `xpath`, the pairing the xpath package's docs
 * recommend, with the `as string` an Express+TS handler needs to compile. The
 * cast is erased; the injection is not.
 */
import { select } from 'xpath';
import { DOMParser } from '@xmldom/xmldom';
import type { Request, Response } from 'express';

export function lookupAccount(req: Request, res: Response): void {
  const doc = new DOMParser().parseFromString(req.body.ledger as string, 'text/xml');
  const nodes = select('//account[@id="' + (req.query.id as string) + '"]', doc);
  res.json({ found: nodes.length });
}
