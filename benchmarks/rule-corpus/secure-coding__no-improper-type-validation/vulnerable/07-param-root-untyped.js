/**
 * VULNERABLE - The tainted root is a function PARAMETER. The service assumes a
 * string identifier and hands it straight to the ORM; the router never checks a
 * type, so an object arrives intact and becomes a query operator.
 */
import { Session } from '../models/session';

export async function terminateSession(sessionToken) {
  return Session.deleteOne({ token: sessionToken });
}

export function attach(router) {
  router.post('/logout', (req, res) =>
    terminateSession(req.body.token).then(() => res.status(204).end()),
  );
}
