/**
 * VULNERABLE (adversarial) - the property name reached through a `const`. A
 * redaction helper that keeps its field list in one place is better code than
 * the inline version, and it is invisible to a rule that only reads the
 * property node.
 */
const SECRET_FIELD = 'password';

function redact(user) {
  delete user[SECRET_FIELD];
  return user;
}

module.exports = { redact, SECRET_FIELD };
