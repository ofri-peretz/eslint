/**
 * ADVERSARIAL, SAFE — a `let` whose every write is a string literal.
 *
 * Picking a pattern by branching on a mode is ordinary code. The binding is
 * `let` rather than `const` only because it is assigned in two places; the SET
 * of values it can ever hold is `{'^\\d+$', '^\\w+$', '^\\S+$'}`, fixed in this
 * source file. Nothing outside the program can add a fourth.
 *
 * The distinction that matters is "are all the writes constant", not "is the
 * keyword `const`". A rule that stops at the keyword reports this.
 */
export function compileTokenMatcher(mode) {
  let source = '^\\d+$';

  if (mode === 'word') {
    source = '^\\w+$';
  } else if (mode === 'any') {
    source = '^\\S+$';
  }

  return new RegExp(source);
}
