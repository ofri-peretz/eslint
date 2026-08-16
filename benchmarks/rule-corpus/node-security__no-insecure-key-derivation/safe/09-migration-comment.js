/**
 * SAFE - the migration landed. `pbkdf2Sync(password, salt, 1000, ...)` survives
 * only in the comment and in the migration note this module exports.
 */
import { scryptSync } from 'node:crypto';

// Was: pbkdf2Sync(password, salt, 1000, 64, 'sha512') until 2026-04-08.
export const MIGRATION_NOTE = 'pbkdf2 1000 rounds -> scrypt N=2^15';

export const derive = (password, salt) => scryptSync(password, salt, 64, { N: 2 ** 15, r: 8, p: 1 });
