/**
 * A dotted-path setter — the `lodash.set` shape, and its CVE.
 *
 * `setByPath(config, 'a.__proto__.isAdmin', true)` creates the intermediate
 * objects as it walks, so the attacker does not even need the target to have a
 * `__proto__` branch already. The key is a `for...of` binding over
 * `path.split('.')`, which is neither a request field nor an obvious taint
 * source — the provenance is one call away, in the caller.
 */
export function setByPath(target, path, value) {
  const segments = path.split('.');
  let cursor = target;

  for (const segment of segments.slice(0, -1)) {
    if (cursor[segment] === undefined) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  cursor[segments[segments.length - 1]] = value;
  return target;
}
