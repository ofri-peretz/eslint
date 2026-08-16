/**
 * VULNERABLE - TypeScript Express middleware minting a CSRF token from
 * Math.random(), written with the `as string` cast a typed handler needs.
 *
 * A predictable CSRF token is no CSRF token: the attacker's page can embed the
 * value it knows the victim's next request will carry.
 */
import type { NextFunction, Request, Response } from 'express';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const csrfToken = (Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)) as string;

  (req.session as Record<string, unknown>).csrf = csrfToken;
  res.setHeader('X-CSRF-Token', csrfToken);
  next();
}
