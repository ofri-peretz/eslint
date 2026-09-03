/**
 * SAFE - `bcrypt`, the native binding. This is exactly what the rule's own
 * password-hash message tells a bcryptjs user to migrate to, so reporting it
 * would report the fix.
 */
const bcrypt = require('bcrypt');

exports.register = async function register(email, password, db) {
  const hash = await bcrypt.hash(password, 12);
  return db.users.insert({ email, hash });
};
