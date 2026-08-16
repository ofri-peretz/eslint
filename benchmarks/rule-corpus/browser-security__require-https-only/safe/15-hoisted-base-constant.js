/**
 * SAFE FOR THIS RULE - The literal lives at its DECLARATION, not in the call.
 * This rule sees `fetch(BASE + name)` with no scheme written down at the call
 * site, so it has nothing to judge; `no-http-urls` reports the constant where
 * it is defined, which is also where the fix belongs.
 *
 * Written as a `safe/` fixture deliberately: it was the obvious candidate for a
 * false negative, and the honest answer is that the family covers it at the
 * other end. Exactly one rule reports this file.
 */
const BASE = 'http://api.acme-corp.io/v1/';

export function getResource(name) {
  return fetch(BASE + name);
}
