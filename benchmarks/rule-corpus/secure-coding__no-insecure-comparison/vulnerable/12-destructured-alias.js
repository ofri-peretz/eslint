/**
 * VULNERABLE (adversarial) - The secret is destructured out under a short alias,
 * so no identifier at the comparison spells anything security-flavoured. The
 * binding still resolves to `session.token`.
 */
import { sessions } from '../store/sessions';

export function admit(req) {
  const { token: t } = sessions.get(req.cookies.sid);
  const presented = req.get('x-session');
  return t === presented;
}
