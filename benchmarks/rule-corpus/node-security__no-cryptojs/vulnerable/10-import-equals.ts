/**
 * VULNERABLE - the TypeScript `import x = require(...)` form, which is what a
 * codebase with `esModuleInterop: false` must write to consume a CommonJS
 * package. The dependency is crypto-js (CWE-1104).
 */
import CryptoJS = require('crypto-js');

export function sign(payload: string, secret: string): string {
  return CryptoJS.HmacSHA1(payload, secret).toString();
}
