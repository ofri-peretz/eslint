/**
 * VULNERABLE - ADVERSARIAL. The cipher is built inside a local helper whose
 * name says nothing about IVs. Indirection at the CALLER must not hide the
 * sink: the static IV is right there in the helper body.
 */
import crypto from 'crypto';

const IV = Buffer.from('a1b2c3d4e5f60718293a4b5c6d7e8f90', 'hex');

/** Express app bootstrap: one helper every route uses. */
function cipherFor(key) {
  return crypto.createCipheriv('aes-256-cbc', key, IV);
}

export function encryptField(key, value) {
  const cipher = cipherFor(key);
  return Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
}
