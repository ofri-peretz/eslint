/**
 * VULNERABLE - Aliased named import (`createCipheriv as makeCipher`) with a
 * literal byte array. Renaming the import must not change the verdict; only
 * the binding does.
 */
import { createCipheriv as makeCipher } from 'crypto';

const KEY = Buffer.from(process.env.MSG_KEY, 'hex');

/** Queue worker: encrypt outbound webhook payloads. */
export function encryptWebhook(payload) {
  const cipher = makeCipher(
    'aes-256-cbc',
    KEY,
    Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
  );
  return Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
}
