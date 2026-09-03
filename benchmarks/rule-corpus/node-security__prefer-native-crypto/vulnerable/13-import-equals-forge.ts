/**
 * ADVERSARIAL VULNERABLE - TypeScript's `import x = require(...)`, the form a
 * codebase with `esModuleInterop: false` must write for a CommonJS package. No
 * ImportDeclaration and no CallExpression appears in this file (CWE-1104).
 */
import forge = require('node-forge');

export function pemToDer(pem: string): string {
  return forge.util.encode64(forge.pem.decode(pem)[0].body);
}
