/**
 * VULNERABLE (wave 2) - `const { random } = Math`.
 *
 * Destructuring a namespace to shorten call sites is ordinary style. The
 * resulting `random()` call is a CallExpression with an Identifier callee, so
 * a rule that only pattern-matches the `Math.random` member shape never sees
 * it, while the entropy is exactly as weak.
 */
'use strict';

const { random, floor } = Math;

function newCsrfToken() {
  const csrfToken = random().toString(36).slice(2) + floor(random() * 1e6);
  return csrfToken;
}

module.exports = { newCsrfToken };
