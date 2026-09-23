/**
 * SAFE — the docs' own prescribed fix, BOUND to a name instead of used as an
 * expression.
 *
 * `Object.assign` returns its FIRST argument and never invokes
 * `SetPrototypeOf`: it performs `[[Set]]` once per own enumerable key of each
 * source. So `Object.assign(Object.create(null), src)` evaluates to the very
 * null-prototype object `Object.create(null)` produced — binding it to a name
 * does not give it a prototype.
 *
 * On a null-`[[Prototype]]` target there is no inherited `__proto__` accessor
 * (that accessor is defined on `Object.prototype`), so
 * `OrdinarySetWithOwnDescriptor` finds `parent === null` and creates a plain
 * own data property. Verified Node 24: for
 * `Object.assign(Object.create(null), JSON.parse('{"__proto__":{"polluted":"yes"}}'))`
 * the target's own keys include `'__proto__'`, its prototype is still `null`,
 * and `({}).polluted` is `undefined`.
 *
 * `safe/06` pins the expression spelling as an assign TARGET. This file pins
 * the const-bound spelling that is then INDEXED — the gap that made the rule
 * certify the shape as prototype-less in one statement and report it at
 * CVSS 9.8 in the next. SPEC.md G1 states the property of the *target*, with
 * no qualification about how the target is spelled.
 *
 * Anchor: burgee packages/burgee/src/yargs-parser.ts:240 (declaration :152)
 * and :247.
 */
export function parseArgs(src, key, value) {
  const defaults = Object.assign(Object.create(null), src);
  defaults[key] = value;

  const argv = Object.assign(Object.create(null), { _: [] });
  argv[key] = value;

  return { defaults, argv };
}
