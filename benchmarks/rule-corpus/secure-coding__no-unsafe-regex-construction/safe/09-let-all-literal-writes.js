/**
 * SAFE (adversarial) - The exact counterpart of vulnerable/11: a `let` with two
 * writes, both of them source-controlled literals. Nothing outside the file can
 * steer either branch.
 *
 * JUDGEMENT: safe. The distinguishing fact is the PROVENANCE of the writes, not
 * that the binding is reassigned.
 */
export function slugMatcher(strict) {
  let pattern = '^[a-z0-9-]+$';
  if (strict) {
    pattern = '^[a-z][a-z0-9-]{2,62}$';
  }
  return new RegExp(pattern, 'u');
}
