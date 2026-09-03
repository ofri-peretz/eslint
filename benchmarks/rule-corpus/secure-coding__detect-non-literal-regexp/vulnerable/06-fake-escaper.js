/** VULNERABLE - a `.replace()` that is NOT an escape. Keying the suppression on
 * a callee NAME would be defeated by `const escapeRegExp = (s) => s`; this
 * rule keys on the search argument being a metacharacter class. */
export function search(req) {
  const notEscaped = req.query.q.replace(/foo/g, 'bar');
  return new RegExp(notEscaped);
}
