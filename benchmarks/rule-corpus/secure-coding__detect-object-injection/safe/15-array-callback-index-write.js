/**
 * SAFE — a write keyed by an Array iteration callback's INDEX argument.
 *
 * ECMA-262 specifies that argument as `𝔽(k)`: a Number the callee supplies,
 * which no caller can influence. It can never be `__proto__`, `constructor`
 * or `prototype`, so no prototype pollution is reachable through it — the
 * same guarantee `safe/01-array-index-loop.js` pins for the plain `for`
 * counter, reached through a callback parameter instead. Covering two
 * spellings of one guarantee and not the third was an accident of node types,
 * which is the argument `safe/07-object-keys-foreach.js` makes for the READ
 * side; this file makes it for the WRITE side.
 *
 * Both receivers here state their provenance in the file: `.split()` returns
 * an Array by spec, and `widths` is a `const` bound to an array literal. That
 * gate is load-bearing rather than ceremonial — `Map`, `Set`, `Headers`,
 * `FormData` and `URLSearchParams` each have a `forEach` whose SECOND callback
 * argument is a KEY, and verified in Node 24
 * `new URLSearchParams('__proto__=x').forEach((v, k) => …)` binds
 * `k === '__proto__'`. Those still report, and the controls in
 * `write-path-branches.test.ts` pin it.
 *
 * A receiver whose Array-ness the file never states — a bare untyped
 * parameter — is NOT exempted and still reports. That residual is recorded in
 * SEAL.json as `array-provenance-requires-evidence`.
 */
export function measureLines(text) {
  const lines = String(text).split('\n');
  const widths = [];

  lines.forEach((line, index) => {
    widths[index] = line.length;
  });

  return widths.reduce((acc, width, index) => {
    acc[index] = Math.max(width, 1);
    return acc;
  }, []);
}
