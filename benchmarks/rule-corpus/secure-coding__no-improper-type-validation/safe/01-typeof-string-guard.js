/**
 * SAFE - The correct remediation for CWE-1287: assert the runtime type before
 * the value is used, and reject everything else. `typeof x !== 'string'` admits
 * neither the array nor the operator object.
 */
import { User } from '../models/user';

export async function findUser(req, res) {
  const email = req.body.email;
  if (typeof email !== 'string') {
    return res.status(400).json({ error: 'email must be a string' });
  }
  const account = await User.findOne({ email });
  return res.json({ id: account?.id ?? null });
}
