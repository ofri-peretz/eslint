/**
 * SAFE (adversarial) - a documentation generator writes a markdown page about
 * the password policy. The word `password` is in a path literal and a heading;
 * there is no credential anywhere. A report here proves the rule reads text
 * rather than tracking a secret.
 */
const fs = require('node:fs');

function emitSecurityDocs(markdown) {
  fs.writeFileSync('./docs/password-policy.md', markdown);
  fs.writeFileSync('./docs/api-key-rotation.md', markdown);
}

module.exports = { emitSecurityDocs };
