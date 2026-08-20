/**
 * VULNERABLE - the KDF parameters collected in a config object, which is how a
 * service that documents its crypto settings in one place writes them. The sink
 * receives 1,000 (CWE-916).
 */
import { pbkdf2Sync } from 'node:crypto';

const KDF = { iterations: 1000, keylen: 64, digest: 'sha512' } as const;

export function derive(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, KDF.iterations, KDF.keylen, KDF.digest);
}
