/**
 * VULNERABLE - path.join(os.tmpdir(), '<constant>') resolves to the same path
 * on every run inside a world-writable directory: the textbook CWE-377
 * predictable temp filename. An attacker who pre-creates or symlinks that name
 * wins the race before the CLI ever writes.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const STATE_FILE = path.join(os.tmpdir(), 'mycli-state.json');

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

module.exports = { saveState, STATE_FILE };
