/**
 * SAFE (wave 3, scope probe) - two functions, each with a local named `raw`.
 *
 * In `mintToken` the `raw` binding becomes a session token, but its entropy is
 * randomBytes. In `pickShard` the `raw` binding IS Math.random, and it becomes
 * a shard number. A rule that follows bindings through a file-wide name map
 * rather than the scope chain will fuse the two and report `pickShard`.
 */
'use strict';

const { randomBytes } = require('node:crypto');

function mintToken() {
  const raw = randomBytes(24).toString('base64url');
  const sessionToken = `sess_${raw}`;
  return sessionToken;
}

function pickShard(shards) {
  const raw = Math.random();
  return Math.floor(raw * shards);
}

module.exports = { mintToken, pickShard };
