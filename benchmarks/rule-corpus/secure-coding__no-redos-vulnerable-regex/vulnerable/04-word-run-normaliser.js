/**
 * VULNERABLE - `(\w+\s*)+` : the classic "one or more words, optional spacing"
 * validator. `\s*` can match empty, so the group boundary inside a run of word
 * characters is ambiguous at every position.
 *
 * Measured on V8 with `'a'.repeat(n) + '!'` : n=16 2.4ms, n=20 9.1ms,
 * n=24 138ms, n=28 2222ms - doubling every character.
 *
 * NOTE ON A REJECTED FIXTURE: `^(\S+\s+)+\S+$` was in this slot first, on the
 * strength of it "looking like" the same family. Timing it says otherwise -
 * n=26 runs in 0.001ms. `\S+` cannot cross whitespace and `\s+` cannot cross
 * non-whitespace, so the split between iterations is forced and there is
 * nothing to backtrack. The analyser called it clean and the analyser was
 * right; the fixture was wrong. Shape is not evidence, here either.
 */
const NAME_RE = /^(\w+\s*)+$/;

export function isDisplayName(value) {
  return NAME_RE.test(value);
}
