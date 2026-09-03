/**
 * VULNERABLE - the legacy namespace spelling. Pre-global-Buffer code required
 * the module and constructed through it: `new buffer.Buffer(n)`. Same
 * constructor, same uninitialized memory — only the callee is a member
 * expression instead of a bare identifier.
 */
const buffer = require('node:buffer');

function allocateLegacyFrame(frameLength) {
  return new buffer.Buffer(frameLength);
}

module.exports = { allocateLegacyFrame };
