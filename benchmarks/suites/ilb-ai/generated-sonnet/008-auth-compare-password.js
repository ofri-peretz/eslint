const bcrypt = require('bcrypt');
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
