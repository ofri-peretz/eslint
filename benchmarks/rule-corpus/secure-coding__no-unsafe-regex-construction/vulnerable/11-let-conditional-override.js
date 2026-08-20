/**
 * VULNERABLE (adversarial) - The conditional-override idiom every
 * options-merging handler is built from. The binding has TWO writes; only the
 * second is tainted, and one tainted write is enough.
 */
import { DEFAULT_SLUG_PATTERN } from '../lib/patterns';

export function slugMatcher(req) {
  let pattern = DEFAULT_SLUG_PATTERN;
  if (req.query.pattern) {
    pattern = req.query.pattern;
  }
  return new RegExp(pattern, 'u');
}
