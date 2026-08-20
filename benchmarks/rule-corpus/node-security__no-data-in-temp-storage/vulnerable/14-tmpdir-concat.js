/**
 * VULNERABLE (adversarial) - string concatenation instead of path.join or a
 * template. Same constant path in the same world-writable directory; only the
 * operator differs.
 */
const os = require('os');
const fs = require('fs');

const AGENT_STATE = os.tmpdir() + '/agent-state.json';

function checkpoint(state) {
  fs.writeFileSync(AGENT_STATE, JSON.stringify(state));
}

module.exports = { checkpoint, AGENT_STATE };
