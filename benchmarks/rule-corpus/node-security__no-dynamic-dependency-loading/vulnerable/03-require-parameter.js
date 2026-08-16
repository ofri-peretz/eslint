/**
 * VULNERABLE - the specifier is a function parameter. A plugin loader exported
 * from a library hands the choice of module to whatever calls it, and the rule
 * has no way to see who that is: the value is unresolved, which is exactly the
 * case a supply-chain rule must report rather than assume clean.
 */
const registry = new Map();

export function loadPlugin(pluginName, options = {}) {
  if (registry.has(pluginName)) return registry.get(pluginName);

  const plugin = require(pluginName);
  const instance = plugin.create(options);
  registry.set(pluginName, instance);
  return instance;
}
