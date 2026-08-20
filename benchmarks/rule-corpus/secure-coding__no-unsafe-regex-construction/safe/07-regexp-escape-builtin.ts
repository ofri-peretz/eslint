/**
 * SAFE - `RegExp.escape` is the ES2025 standard escaper, shipped in Node 24 and
 * every current browser. It is the exact remediation for fixture
 * vulnerable/01, expressed with the built-in instead of a dependency.
 */
import type { Request, Response } from 'express';
import { catalogue } from '../lib/catalogue';

export function search(req: Request, res: Response): void {
  const matcher = new RegExp(RegExp.escape(req.query.pattern as string), 'i');
  res.json(catalogue.all().filter((p) => matcher.test(p.title)));
}
