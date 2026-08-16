/**
 * VULNERABLE (adversarial) - fs-extra's outputFile is a drop-in write that also
 * creates the parent directory. It is what people reach for in scaffolding
 * code, and it puts the client secret on disk in the clear.
 */
const fse = require('fs-extra');

async function scaffoldCredentials(dest, clientSecret) {
  await fse.outputFile(dest, clientSecret);
}

module.exports = { scaffoldCredentials };
