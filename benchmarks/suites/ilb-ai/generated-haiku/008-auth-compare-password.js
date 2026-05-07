const crypto = require('crypto');
function comparePassword(password, hash) {
  return crypto.timingSafeEqual(
    Buffer.from(crypto.createHash('sha256').update(password).digest('hex')),
    Buffer.from(hash)
  );
}
module.exports = comparePassword;
