/**
 * ADVERSARIAL SAFE - the strongest attack available: a LOCAL object with the
 * exact `lib.WordArray.random` shape, written during the migration so call
 * sites did not all have to change at once. Every identifier in the chain is
 * crypto-js's; every byte comes from node:crypto.
 */
import { randomBytes } from 'node:crypto';

const CryptoJS = {
  lib: {
    WordArray: {
      random: (nBytes) => randomBytes(nBytes),
    },
  },
  enc: { Hex: 'hex' },
};

export const salt = () => CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
