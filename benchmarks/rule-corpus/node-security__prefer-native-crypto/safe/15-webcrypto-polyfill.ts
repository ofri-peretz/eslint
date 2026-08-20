/**
 * ADVERSARIAL SAFE - a scoped WebCrypto polyfill. It IMPLEMENTS the native API
 * rather than reimplementing a primitive beside it, and the base-name split of
 * a scoped specifier yields the scope, not the package.
 */
import { Crypto } from '@peculiar/webcrypto';

const crypto = new Crypto();

export const digest = (bytes: Uint8Array): Promise<ArrayBuffer> =>
  crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
