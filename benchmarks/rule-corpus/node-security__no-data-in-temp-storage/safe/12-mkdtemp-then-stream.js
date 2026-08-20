/**
 * SAFE (adversarial) - a streamed write, but into a directory mkdtemp created
 * with a random suffix and mode 0700. The stream sink is present; the
 * predictable path is not.
 */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

function openScratchStream() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-'));
  return fs.createWriteStream(path.join(dir, 'stream.bin'));
}

module.exports = { openScratchStream };
