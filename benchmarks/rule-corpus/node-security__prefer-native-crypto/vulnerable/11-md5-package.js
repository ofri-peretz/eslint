/**
 * VULNERABLE - the `md5` package: a pure-JS digest of a primitive node:crypto
 * exposes directly. Same class of dependency as js-md5 and blueimp-md5, which
 * this rule already names (CWE-1104).
 */
const md5 = require('md5');

exports.cacheKey = (parts) => md5(parts.join('|'));
