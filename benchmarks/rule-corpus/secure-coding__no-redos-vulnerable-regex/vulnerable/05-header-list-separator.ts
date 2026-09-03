/**
 * VULNERABLE (TypeScript) - The `(\s*,\s*)*` separator shape from the
 * Cloudflare-2019 family of patterns. Optional whitespace on both sides of the
 * comma means the engine can distribute one run of spaces across many
 * iterations of the group, and the outer `*` multiplies that ambiguity.
 */
import type { Request, Response, NextFunction } from 'express';

const ACCEPT_LIST = /^([\w-]+(\s*,\s*)*)*$/;

export function validateAcceptEncoding(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['accept-encoding'] as string;
  if (header && !ACCEPT_LIST.test(header)) {
    res.status(400).end();
    return;
  }
  next();
}
