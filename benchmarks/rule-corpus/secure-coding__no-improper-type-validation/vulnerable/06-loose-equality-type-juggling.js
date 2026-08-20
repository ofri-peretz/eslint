/**
 * VULNERABLE - Type juggling in an authorization decision. The stored code is a
 * number and the submitted one is a string, so `'0e123' == 0` and `'0' == 0`
 * both pass. Loose equality is the bypass primitive here, not a style nit.
 */
import { resetCodes } from '../store/reset-codes';

export function confirmReset(req, res) {
  const storedCode = resetCodes.get(req.body.accountId);
  if (req.body.code == storedCode) {
    return res.json({ ok: true });
  }
  return res.status(403).json({ error: 'bad code' });
}
