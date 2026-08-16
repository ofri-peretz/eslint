/**
 * VULNERABLE - The equally widespread "validate a URL" regex. The tail
 * `([\/\w \.-]*)*` is a star inside a star over one character class: the
 * canonical catastrophic-backtracking shape. A long path that ends in a
 * character outside the class pins a CPU core.
 */
const URL_RE = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

export function isPublicUrl(candidate) {
  return URL_RE.test(candidate);
}
