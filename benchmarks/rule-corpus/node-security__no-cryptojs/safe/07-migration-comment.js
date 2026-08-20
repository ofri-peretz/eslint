/**
 * SAFE - the migration landed. The only mention of crypto-js left in this file
 * is the comment recording why it went away.
 */
import { createHash } from 'node:crypto';

// Replaced crypto-js's SHA256 with node:crypto on 2026-02-11; the digests are
// byte-identical, so no stored hash needed rewriting.
export function contentHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}
