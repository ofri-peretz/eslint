/**
 * VULNERABLE - the import is aliased, so no identifier in the call chain is
 * spelled `CryptoJS`. The API reached is unchanged (CWE-338).
 */
import { lib as cjsLib } from 'crypto-js';

export function apiKey() {
  return cjsLib.WordArray.random(48).toString();
}
