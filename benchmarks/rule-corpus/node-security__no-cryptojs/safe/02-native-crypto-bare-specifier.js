/**
 * SAFE - the bare `crypto` specifier rather than `node:crypto`. Same builtin,
 * different spelling; neither is a third-party package.
 */
const crypto = require('crypto');

exports.newSessionId = () => crypto.randomBytes(32).toString('base64url');
