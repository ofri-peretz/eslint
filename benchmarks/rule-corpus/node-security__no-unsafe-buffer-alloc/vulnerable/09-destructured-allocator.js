/**
 * VULNERABLE (adversarial) - `allocUnsafe` destructured off `Buffer` and
 * called as a bare identifier. Hot-path serializers hoist it this way to skip
 * the property lookup; the allocation is identical.
 */
const { allocUnsafe } = require('node:buffer').Buffer;

function scratch(bytes) {
  const page = allocUnsafe(bytes);
  return page;
}

module.exports = { scratch };
