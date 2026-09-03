/**
 * SAFE - The IV arrives as a function parameter. The rule cannot see the
 * caller, and guessing would report every well-factored crypto helper in the
 * ecosystem.
 */
import crypto from 'node:crypto';

/** Shared helper used by both the encrypt job and the re-key migration. */
export function encryptWith(key, iv, plaintext) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
}
