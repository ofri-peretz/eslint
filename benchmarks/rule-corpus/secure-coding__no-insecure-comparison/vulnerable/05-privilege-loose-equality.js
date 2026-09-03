/**
 * VULNERABLE - An authorization decision made with `==` against a number. The
 * request body is JSON, so `admin` can be the string `"1"`, the number `1`, or
 * `true` - all three coerce equal and all three grant the elevated path.
 */
import { auditLog } from '../lib/audit-log';

export function elevate(req, res) {
  if (req.body.admin == 1) {
    auditLog.record('elevated', req.body.accountId);
    return res.json({ role: 'admin' });
  }
  return res.status(403).json({ error: 'forbidden' });
}
