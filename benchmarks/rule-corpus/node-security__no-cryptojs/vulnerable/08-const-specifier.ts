/**
 * VULNERABLE - the specifier is hoisted to a module constant, which is ordinary
 * style rather than obfuscation, and the result is cast so TypeScript keeps the
 * package's types. `require(LEGACY_CRYPTO_PACKAGE)` loads crypto-js (CWE-1104).
 */
const LEGACY_CRYPTO_PACKAGE = 'crypto-js';

const CryptoJS = require(LEGACY_CRYPTO_PACKAGE) as typeof import('crypto-js');

export function legacyDigest(value: string): string {
  return CryptoJS.MD5(value).toString();
}
