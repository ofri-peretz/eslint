const bcrypt = require('bcrypt');
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
module.exports = comparePassword;
