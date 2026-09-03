/**
 * VULNERABLE - the import renamed at the boundary, which is how a codebase that
 * wraps its KDF behind a domain name writes it. Same primitive, 1,200 rounds
 * (CWE-916).
 */
import { pbkdf2Sync as deriveKeyMaterial } from 'node:crypto';

export const stretch = (password, salt) =>
  deriveKeyMaterial(password, salt, 1200, 32, 'sha256');
