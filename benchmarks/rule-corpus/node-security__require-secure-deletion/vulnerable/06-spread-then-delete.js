/**
 * VULNERABLE - the copy is taken BEFORE the delete, so the secret survives in
 * `audit` and is about to be written to the audit log. This is the "make sure
 * no copy was spread first" half of CWE-459, and it is the half that actually
 * leaks.
 */
function recordProfileUpdate(logger, user) {
  const audit = { ...user };
  delete user.passphrase;
  logger.info({ event: 'profile.update', before: audit });
  return user;
}

module.exports = { recordProfileUpdate };
