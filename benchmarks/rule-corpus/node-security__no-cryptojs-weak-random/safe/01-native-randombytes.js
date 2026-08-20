/**
 * SAFE - the correct remediation of vulnerable/01: session ids from the
 * platform CSPRNG.
 */
import { randomBytes } from 'node:crypto';

export function issueSession(res) {
  const token = randomBytes(32).toString('hex');
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax' });
  return token;
}
