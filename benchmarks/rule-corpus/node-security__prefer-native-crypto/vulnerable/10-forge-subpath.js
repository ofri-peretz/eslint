/**
 * VULNERABLE - a deep subpath of node-forge. The base package is the dependency
 * whether or not the import reaches into it (CWE-1104).
 */
const rsa = require('node-forge/lib/rsa');

exports.generate = (bits) => rsa.generateKeyPair({ bits });
