/**
 * SAFE - an unrelated `WordArray`: the EFF passphrase wordlist. `random` here
 * picks a word, and it picks it with the platform CSPRNG.
 */
import { randomInt } from 'node:crypto';

import { WordArray } from './eff-wordlist';

export function passphrase(words = 6) {
  return Array.from({ length: words }, () => WordArray.random(randomInt)).join('-');
}
