/**
 * VULNERABLE - ADVERSARIAL. Optional chaining on the namespace,
 * `crypto?.createCipheriv(...)`. Codebases that support a stripped runtime
 * write this defensively; the AST node type changes, the bug does not.
 */
const crypto = require('crypto');

const KEY = Buffer.from(process.env.PLUGIN_KEY, 'hex');

/** CLI entry point: encrypt a plugin manifest for offline distribution. */
function encryptManifest(manifest) {
  const cipher = crypto?.createCipheriv('aes-256-cbc', KEY, Buffer.alloc(16));
  return Buffer.concat([cipher.update(manifest, 'utf8'), cipher.final()]);
}

module.exports = { encryptManifest };
