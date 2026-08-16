/**
 * VULNERABLE (adversarial wave) - The "make it configurable" commit: the
 * request value is kept, a default is added beside it, and the whole thing
 * moves behind a ternary and a nullish coalesce.
 *
 * Both spellings still put `req.query.pattern` in the format position on one of
 * their paths. A finding a reviewer can delete by adding a fallback is not a
 * finding.
 */
import { format } from 'node:util';
import type { Request } from 'express';

const DEFAULT_PATTERN = 'account=%s';

export function describe(req: Request, account: { id: string; apiKey: string }): string {
  const chosen = req.query.strict ? DEFAULT_PATTERN : (req.query.pattern as string);
  return format(chosen ?? DEFAULT_PATTERN, account.id, account.apiKey);
}
