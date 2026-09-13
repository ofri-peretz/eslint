/**
 * The copy loop again, in the spelling a callback gives it.
 *
 * Identical to `03-merge-helper-copy-loop.js` in every way that matters to the
 * weakness — attacker-supplied `source`, no guard, the keys walked straight onto
 * `target` — and written the way most application code actually writes it.
 *
 * The rule reported the `for...in` and `for...of Object.keys()` spellings and
 * was silent on this one until 2026-09-13, because the mass-assignment listener
 * was registered on `ForOfStatement` only. The spelling was deciding the
 * verdict, not the security judgement.
 *
 * Measured in Node 24, this exact function:
 *   mergeOptions({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'))
 *   ({}).polluted === 'yes'                       // global, not one object
 *   mergeOptions(user, JSON.parse('{"isAdmin":true}'))
 *   user.isAdmin === true                          // caller picks the field
 *
 * `JSON.parse` defines `__proto__` as an OWN property, so it appears in
 * `Object.keys` — which is why enumerating "own keys" is not a guard here.
 */
export function mergeOptions(target, source) {
  Object.keys(source).forEach((key) => {
    if (typeof source[key] === 'object' && source[key] !== null) {
      mergeOptions(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
  return target;
}
