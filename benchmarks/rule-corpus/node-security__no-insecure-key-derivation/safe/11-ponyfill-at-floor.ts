/**
 * SAFE - the `pbkdf2` npm ponyfill, called at the floor. Same signature as
 * node:crypto's, with the cast a TypeScript caller writes for a config value.
 */
import { pbkdf2Sync } from 'pbkdf2';

export function derive(password: string, salt: string, cfg: { keylen: unknown }): Buffer {
  return pbkdf2Sync(password, salt, 650000, cfg.keylen as number, 'sha512');
}
