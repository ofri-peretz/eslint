/**
 * ADVERSARIAL VULNERABLE - the primitive bound to a local name once, which is
 * how a module that calls it from several helpers avoids repeating the
 * namespace. 8,192 rounds (CWE-916).
 */
import crypto from 'node:crypto';

const kdf = crypto.pbkdf2Sync;

export const derive = (password, salt) => kdf(password, salt, 8192, 64, 'sha512');
