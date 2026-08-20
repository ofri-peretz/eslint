/**
 * VULNERABLE - THE canonical CWE-1287. Express' default query parser turns
 * `?email[$ne]=x` into an OBJECT, so `email` is not the string this code assumes.
 * Mongoose interpolates the object as a query operator and the login check is
 * bypassed. The defect is the ABSENCE of a type check, which is exactly what
 * "improper validation of specified type of input" names.
 */
import { User } from '../models/user';

export async function login(req, res) {
  const { email, password } = req.body;
  const account = await User.findOne({ email, password });
  if (!account) return res.status(401).json({ error: 'invalid credentials' });
  return res.json({ id: account.id });
}
