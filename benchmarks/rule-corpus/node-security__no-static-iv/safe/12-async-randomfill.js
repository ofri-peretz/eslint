/**
 * SAFE - ADVERSARIAL. The callback form, `crypto.randomFill(iv, cb)`, filling
 * the buffer before the cipher is constructed inside the callback. Same
 * remediation as the sync form, reached through a different call shape.
 */
const crypto = require('node:crypto');

const KEY = Buffer.from(process.env.STREAM_KEY, 'hex');

/** Stream handler: encrypt a chunk once the IV has been filled. */
function encryptChunk(chunk, done) {
  const iv = Buffer.alloc(16);
  crypto.randomFill(iv, (err) => {
    if (err) return done(err);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
    done(null, Buffer.concat([iv, cipher.update(chunk), cipher.final()]));
  });
}

module.exports = { encryptChunk };
