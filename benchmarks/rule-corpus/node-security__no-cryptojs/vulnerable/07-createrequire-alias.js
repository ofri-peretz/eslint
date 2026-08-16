/**
 * VULNERABLE - an ESM CLI reaching a CommonJS-only package through
 * `createRequire`. The loader is bound to a local name, so the callee is not
 * spelled `require`, but the module that gets loaded is crypto-js (CWE-1104).
 */
import { createRequire } from 'node:module';

const loadCjs = createRequire(import.meta.url);
const CryptoJS = loadCjs('crypto-js');

export function fingerprint(input) {
  return CryptoJS.SHA256(input).toString();
}
