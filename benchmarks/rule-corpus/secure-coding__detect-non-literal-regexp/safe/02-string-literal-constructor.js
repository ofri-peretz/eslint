/**
 * SAFE — `new RegExp('literal', flags)`.
 *
 * The constructor form is required here because the flags are assembled from a
 * boolean, and a literal cannot take a computed flag string. The PATTERN is a
 * string literal, so nothing outside the program chooses it. A rule literally
 * named "non-literal-regexp" reporting a literal would contradict its own name;
 * `allowLiterals` defaults to true for exactly that reason.
 */
export function buildInvoiceMatcher({ caseSensitive }) {
  return new RegExp('^INV-\\d{4}-[A-Z]{3}$', caseSensitive ? '' : 'i');
}
