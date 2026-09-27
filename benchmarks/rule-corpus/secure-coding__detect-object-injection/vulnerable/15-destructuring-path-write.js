/**
 * The two-step traversal (SPEC A3) spelled as a destructuring assignment.
 *
 * `[target[a][b]] = [value]` runs PutValue on `target[a][b]` exactly as
 * `target[a][b] = value` does. Executed in Node 24:
 *
 *   setPair({}, '__proto__', 'polluted', 'yes');
 *   ({}).polluted === 'yes'   // GLOBAL pollution
 *
 * Until 2026-09-27 the rule treated a member inside a destructuring pattern as
 * a READ and exempted it, so this spelling was silent while the plain
 * assignment reported (SPEC N10).
 */
export function setPair(target, a, b, value) {
  [target[a][b]] = [value];
  return target;
}
