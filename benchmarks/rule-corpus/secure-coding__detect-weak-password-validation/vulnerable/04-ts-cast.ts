/**
 * TypeScript: the body is cast to a DTO and the policy reads a field off it.
 *
 * The cast puts a MemberExpression between the check and the identifier, which
 * is enough to hide the finding from an object-must-be-an-Identifier check —
 * even though the property being measured is spelled out on the same line.
 */
import type { Request, Response } from 'express';

import { accountService } from '../services/account-service';

interface ChangePasswordDto {
  currentPassword: string;
  password: string;
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const credentials = req.body as ChangePasswordDto;

  if (credentials.password.length >= 6) {
    await accountService.changePassword(req.session.userId, credentials.password);
    res.json({ ok: true });
    return;
  }

  res.status(400).json({ error: 'Password too short' });
}
