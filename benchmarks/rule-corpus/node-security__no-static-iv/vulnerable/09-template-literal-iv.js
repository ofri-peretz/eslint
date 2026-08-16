/**
 * VULNERABLE - The same fixed hex, spelled with backticks. A template literal
 * with no expressions is a string constant; the quoting style is not a
 * security property.
 */
import { createCipheriv } from 'node:crypto';

const KEY = Buffer.from(process.env.NOTE_KEY, 'hex');

/** Express route: encrypt a note body before persisting it. */
export function encryptNote(text) {
  const cipher = createCipheriv('aes-256-cbc', KEY, Buffer.from(`00112233445566778899aabbccddeeff`, 'hex'));
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
}
