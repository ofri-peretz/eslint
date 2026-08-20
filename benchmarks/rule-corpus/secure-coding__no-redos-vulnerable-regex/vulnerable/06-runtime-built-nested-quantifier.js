/**
 * VULNERABLE - The pattern is assembled at runtime from configuration and the
 * caller wraps the interpolated fragment in a second quantifier: `^(<frag>+)+$`.
 * Whatever the fragment is, the surrounding `(...+)+` makes it catastrophic.
 * Runtime assembly is what hides this from a reader, not what makes it safe.
 */
import { escapeRegExp } from 'lodash-es';

export function buildTokenMatcher(allowedChars) {
  const fragment = escapeRegExp(allowedChars);
  return new RegExp(`^(${fragment}+)+$`);
}
