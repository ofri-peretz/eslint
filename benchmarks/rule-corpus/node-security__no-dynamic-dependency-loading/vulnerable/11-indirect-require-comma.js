/**
 * VULNERABLE (adversarial) - `(0, require)(name)` is the standard idiom for
 * defeating a bundler's static analysis of `require`, used precisely when the
 * author wants a specifier the toolchain cannot see. It is the same loader
 * with the same attacker-supplied specifier.
 */
const load = (0, require);

export function loadNativeBinding(req) {
  const target = req.query.abi;
  return (0, require)(`./build/${target}/binding.node`);
}

export function loadAny(name) {
  return load(name);
}
