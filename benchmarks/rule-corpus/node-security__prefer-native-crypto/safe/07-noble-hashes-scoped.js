/**
 * SAFE - @noble/hashes, an audited modern package under a scope. It is also the
 * probe for the base-name split: a scoped specifier's first path segment is the
 * scope, not the package.
 */
import { sha256 } from '@noble/hashes/sha256';

export const commitment = (bytes) => Buffer.from(sha256(bytes)).toString('hex');
