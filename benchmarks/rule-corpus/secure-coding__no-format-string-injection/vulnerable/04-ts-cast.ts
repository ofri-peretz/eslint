/**
 * VULNERABLE - Express + TypeScript. `req.query.pattern` is typed
 * `string | string[] | ParsedQs`, so the handler casts it, and the cast is the
 * only thing standing between the query string and the format position.
 */
import util from 'node:util';
import type { Request } from 'express';

export function describeAccount(req: Request, account: { id: string; apiKey: string }): string {
  return util.format(req.query.pattern as string, account.id, account.apiKey);
}
