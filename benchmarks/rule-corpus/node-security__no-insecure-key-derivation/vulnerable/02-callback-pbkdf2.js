/**
 * VULNERABLE - the callback form, imported as a bare identifier. 10,000
 * iterations still sits an order of magnitude under the floor (CWE-916).
 */
import { pbkdf2, randomBytes } from 'node:crypto';

export function derive(password, done) {
  const salt = randomBytes(16);
  pbkdf2(password, salt, 10000, 32, 'sha256', (err, key) => done(err, { salt, key }));
}
