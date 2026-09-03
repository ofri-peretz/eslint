/**
 * VULNERABLE - bcryptjs, the pure-JavaScript bcrypt, on the registration path.
 * The same cost factor buys far less work than the native binding, so the
 * effective protection is lower than the configuration claims (CWE-1104).
 */
const bcrypt = require('bcryptjs');

exports.register = async function register(email, password, db) {
  const hash = await bcrypt.hash(password, 10);
  return db.users.insert({ email, hash });
};
