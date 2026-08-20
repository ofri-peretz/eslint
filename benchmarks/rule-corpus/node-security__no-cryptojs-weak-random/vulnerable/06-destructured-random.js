/**
 * VULNERABLE - `random` destructured straight off WordArray. Identical to
 * fixture 05 in effect, written the way a module with a single use site would
 * be (CWE-338).
 */
const { lib } = require('crypto-js');

const { random } = lib.WordArray;

exports.nonce = () => random(12).toString();
