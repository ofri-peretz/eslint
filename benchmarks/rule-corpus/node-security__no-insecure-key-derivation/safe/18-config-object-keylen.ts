/**
 * ADVERSARIAL SAFE - a KDF config object holding BOTH a small number and a
 * large one. `keylen` is 32 and `iterations` is 600,000; the rule has to read
 * the key it was asked for rather than the first number it finds.
 */
import { pbkdf2Sync } from 'node:crypto';

const KDF = { iterations: 600000, keylen: 32, digest: 'sha256' } as const;

export const derive = (password: string, salt: Buffer): Buffer =>
  pbkdf2Sync(password, salt, KDF.iterations, KDF.keylen, KDF.digest);
