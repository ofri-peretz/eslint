/**
 * VULNERABLE - Comparing password digests with `===`. Hashing the input does not
 * remove the timing channel: the comparison still short-circuits, and a leaked
 * digest prefix plus an offline search recovers the password.
 */
import crypto from 'node:crypto';
import { credentials } from '../store/credentials';

export function checkPassword(accountId, submitted) {
  const storedHash = credentials.get(accountId);
  const submittedHash = crypto.createHash('sha256').update(submitted).digest('hex');
  return storedHash === submittedHash;
}
