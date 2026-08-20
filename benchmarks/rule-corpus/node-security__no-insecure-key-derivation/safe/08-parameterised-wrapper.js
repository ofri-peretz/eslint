/**
 * SAFE - a KDF wrapper whose iteration count is a parameter. Its one caller
 * passes the floor; the wrapper itself contains no weak constant.
 */
import { pbkdf2Sync } from 'node:crypto';

export function stretch(password, salt, iterations, keylen = 64) {
  return pbkdf2Sync(password, salt, iterations, keylen, 'sha512');
}

export const derive = (password, salt) => stretch(password, salt, 600000);
