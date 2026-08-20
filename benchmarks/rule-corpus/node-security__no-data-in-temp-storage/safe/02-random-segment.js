/**
 * SAFE - a random segment in the name is the other accepted mitigation: the
 * resolved path differs on every run, so there is nothing for an attacker to
 * pre-create.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

function stageChunk(buffer) {
  const target = path.join(os.tmpdir(), `chunk-${randomUUID()}.bin`);
  fs.writeFileSync(target, buffer, { mode: 0o600 });
  return target;
}

module.exports = { stageChunk };
