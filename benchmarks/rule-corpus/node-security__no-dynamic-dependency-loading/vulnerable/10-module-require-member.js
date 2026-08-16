/**
 * VULNERABLE (adversarial) - `module.require()` and `require.main.require()`
 * are both real, documented Node loader entry points. They resolve against a
 * different module's paths, which is precisely why plugin hosts reach for
 * them - and here the specifier comes off an HTTP request either way.
 */
export function installHook(req) {
  const hookModule = req.body.hook;
  const hook = module.require(hookModule);

  const legacy = require.main.require(req.body.legacyHook);

  return { hook, legacy };
}
