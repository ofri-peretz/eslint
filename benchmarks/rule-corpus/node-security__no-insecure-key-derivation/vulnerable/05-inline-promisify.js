/**
 * VULNERABLE - the same promisification written inline at the call site
 * (CWE-916).
 */
import crypto from 'node:crypto';
import util from 'node:util';

export const derive = (password, salt) =>
  util.promisify(crypto.pbkdf2)(password, salt, 4096, 32, 'sha256');
