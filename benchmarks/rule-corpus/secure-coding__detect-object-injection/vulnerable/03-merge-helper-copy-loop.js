/**
 * The copy loop — THE prototype-pollution primitive.
 *
 * Every `merge` / `extend` / `deepAssign` helper on npm is written this way, and
 * it is how CVE-2018-3721 (lodash), CVE-2018-16487 (lodash.merge) and
 * deep-extend's CVE-2018-3750 all worked: `source` is attacker-supplied JSON, it
 * carries a `__proto__` key, and the loop walks it straight onto the prototype.
 *
 * `key` is a `for...in` binding, which looks entirely innocent to any check that
 * asks "is this identifier tainted?" — the taint is in the OBJECT being
 * enumerated, not in the binding.
 */
export function mergeOptions(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}
