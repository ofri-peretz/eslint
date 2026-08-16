/**
 * VULNERABLE - optional chaining through a namespace that TypeScript types as
 * possibly undefined. The call still lands on crypto-js's weak generator
 * (CWE-338).
 */
import * as CryptoJS from 'crypto-js';

export function deviceSecret(): string {
  return (CryptoJS?.lib?.WordArray?.random(32) as { toString(): string }).toString();
}
