/**
 * VULNERABLE (adversarial) - the vm entry point reached through a computed
 * member. The property is a module constant, so the sink is decidable; a
 * visitor that only reads dotted property names never sees it.
 */
const vm = require('node:vm');

const VM_API = 'runInNewContext';

export function evaluate(source, context) {
  return vm[VM_API](source, context, { timeout: 100 });
}
