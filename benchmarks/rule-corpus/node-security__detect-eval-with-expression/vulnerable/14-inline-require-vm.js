/**
 * VULNERABLE (adversarial) - `require('node:vm')` inline at the call site. No
 * local binding is ever created, so a rule that only tracks bindings sees
 * nothing.
 */
module.exports = function runPolicy(policySource, facts) {
  const context = { facts, allow: false };
  require('node:vm').runInNewContext(policySource, context, { timeout: 50 });
  return context.allow;
};
