/**
 * SAFE - a LOCAL module whose filename contains a library name. `./forge` here
 * is this project's certificate-building helper; the specifier is a relative
 * path, not a package.
 */
const { buildCsr } = require('./forge-adapter');

exports.csr = (subject) => buildCsr(subject);
