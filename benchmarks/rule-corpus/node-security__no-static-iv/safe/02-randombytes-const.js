/**
 * SAFE - The same remediation with the IV held in a `const` inside the
 * function. Per-call scope, so the constant is fresh every invocation — the
 * `const` keyword is not what makes an IV static.
 */
import { createCipheriv, randomBytes } from 'node:crypto';

const KEY = Buffer.from(process.env.CARD_KEY, 'base64');

export function encryptCardNumber(pan) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const body = Buffer.concat([cipher.update(pan, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}
