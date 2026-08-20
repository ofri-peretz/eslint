/**
 * VULNERABLE - Session-token equality in TypeScript, with an `as string` cast
 * that changes nothing at runtime. A cast is not a comparison primitive.
 */
import type { Request } from 'express';
import { sessions } from '../store/sessions';

export function resolveSession(req: Request): string | null {
  const presentedToken = req.headers['x-session'] as string;
  for (const [userId, storedToken] of sessions) {
    if (storedToken === presentedToken) {
      return userId;
    }
  }
  return null;
}
