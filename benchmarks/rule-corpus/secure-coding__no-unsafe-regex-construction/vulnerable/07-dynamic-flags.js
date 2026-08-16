/**
 * VULNERABLE - The pattern is fine; the FLAGS are not. Flags assembled at
 * runtime can silently add `g`/`y`, which makes `lastIndex` stateful and turns
 * a validation `test()` into an alternating pass/fail oracle.
 */
import { SLUG_PATTERN } from '../lib/patterns';

export function buildMatcher(routeConfig) {
  return new RegExp(SLUG_PATTERN, routeConfig.flags);
}
