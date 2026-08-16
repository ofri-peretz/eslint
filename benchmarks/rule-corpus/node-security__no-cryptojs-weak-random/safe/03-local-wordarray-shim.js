/**
 * SAFE - the migration shim. A LOCAL class named WordArray, written so the call
 * sites that used to reach crypto-js keep compiling, whose `random` is
 * node:crypto's CSPRNG. The name is crypto-js's; the entropy is the platform's.
 */
import { randomBytes } from 'node:crypto';

export class WordArray {
  constructor(words) {
    this.words = words;
  }

  static random(nBytes) {
    const buf = randomBytes(nBytes);
    const words = [];
    for (let i = 0; i < buf.length; i += 4) words.push(buf.readUInt32BE(i));
    return new WordArray(words);
  }

  toString() {
    return this.words.map((w) => w.toString(16).padStart(8, '0')).join('');
  }
}

export const salt = () => WordArray.random(16);
