/**
 * VULNERABLE - Buffer.from() of a hex literal, reached through a destructured
 * `node:`-prefixed import. Same fixed 16 bytes on every request.
 */
import { createCipheriv } from 'node:crypto';

const KEY = Buffer.from(process.env.CARD_KEY, 'base64');

export function encryptCardNumber(pan) {
  const cipher = createCipheriv(
    'aes-256-cbc',
    KEY,
    Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'),
  );
  return Buffer.concat([cipher.update(pan, 'utf8'), cipher.final()]).toString('base64');
}
