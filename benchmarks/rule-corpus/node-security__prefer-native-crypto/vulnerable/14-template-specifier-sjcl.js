/**
 * ADVERSARIAL VULNERABLE - the specifier spelled with backticks and nothing
 * interpolated into it. A backtick string is the same constant (CWE-1104).
 */
const sjcl = require(`sjcl`);

exports.seal = (passphrase, plaintext) => sjcl.encrypt(passphrase, plaintext);
