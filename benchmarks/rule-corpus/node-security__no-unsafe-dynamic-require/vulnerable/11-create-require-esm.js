/**
 * VULNERABLE (adversarial) - `createRequire` is the documented way to reach the
 * CJS loader from ESM. The local is a plain `const` bound to the loader, which
 * is the same shape as `const load = require` one call deeper.
 */
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);

export function loadTransform(req) {
  return requireCjs(req.body.transform);
}
