/**
 * VULNERABLE (adversarial) - `module.createRequire` is the documented way an
 * ESM file loads CommonJS. The loader is bound to a local name, so the call
 * never forms a callee spelled `require` - but the specifier is still
 * `process.argv`, and this is exactly fixture 01 with one extra hop.
 */
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);

export function loadReporter() {
  const name = process.argv[2];
  return requireCjs(name);
}
