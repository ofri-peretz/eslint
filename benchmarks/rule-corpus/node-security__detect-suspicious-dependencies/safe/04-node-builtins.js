/**
 * SAFE - Node builtins in both spellings. `node:`-prefixed specifiers can
 * never resolve to a registry package at all, and the bare forms are shadowed
 * by the builtin, so neither is squattable.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('crypto');
const { Readable } = require('node:stream');

async function hashFile(file) {
  const bytes = await fs.readFile(path.resolve(file));
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function toStream(text) {
  return Readable.from([text]);
}

module.exports = { hashFile, toStream };
