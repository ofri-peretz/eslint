/**
 * SAFE - the remediation the rule's own message prescribes: overwrite the value
 * and zero-fill the buffer instead of unbinding the property.
 */
function scrubCredentials(session) {
  if (Buffer.isBuffer(session.secretKey)) session.secretKey.fill(0);
  session.password = undefined;
  session.refreshToken = undefined;
  return session;
}

module.exports = { scrubCredentials };
