/**
 * SAFE - The format strings live in a catalogue written in this file; the
 * request only chooses WHICH one. The user controls a key, never the template,
 * which is the standard i18n mitigation for CWE-134.
 */
const util = require('node:util');

const MESSAGES = {
  welcome: 'Welcome back, %s',
  expired: 'Session for %s expired at %s',
  denied: 'Access denied for %s',
};

function localize(req, account) {
  const template = MESSAGES[req.query.key] ?? MESSAGES.denied;
  return util.format(template, account.displayName, account.expiresAt);
}

module.exports = { localize };
