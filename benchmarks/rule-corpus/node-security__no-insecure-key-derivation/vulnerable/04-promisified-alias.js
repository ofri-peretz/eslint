/**
 * VULNERABLE - the promisified form, which is how most modern Node code calls
 * pbkdf2. `promisify` returns the same primitive under a new name, and the
 * iteration count is still 2,048 (CWE-916).
 */
import { pbkdf2, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

export async function derive(password) {
  const salt = randomBytes(16);
  const key = await pbkdf2Async(password, salt, 2048, 64, 'sha512');
  return { salt, key };
}
