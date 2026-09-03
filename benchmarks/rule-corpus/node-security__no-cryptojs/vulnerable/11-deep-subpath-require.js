/**
 * VULNERABLE - a deep internal subpath of the same package, required at the top
 * of a build script that pre-computes asset hashes (CWE-1104).
 */
const WordArray = require('crypto-js/lib-typedarrays');
const SHA256 = require('crypto-js/sha256');

exports.hashAsset = (bytes) => SHA256(WordArray.create(bytes)).toString();
