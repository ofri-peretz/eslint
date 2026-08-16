/**
 * VULNERABLE - one iteration. PBKDF2 with a count of 1 is a salted HMAC, which
 * is the degenerate case CWE-916 exists for.
 */
const { pbkdf2Sync } = require('crypto');

exports.legacyImportHash = (password, salt) =>
  pbkdf2Sync(password, salt, 1, 20, 'sha1').toString('hex');
