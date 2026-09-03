/**
 * VULNERABLE - the namespace import spelling, 20,000 rounds. Under the floor by
 * a factor of 30 (CWE-916).
 */
import * as nodeCrypto from 'node:crypto';

export const derive = (password, salt) =>
  nodeCrypto.pbkdf2Sync(password, salt, 20000, 64, 'sha512');
