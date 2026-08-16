/**
 * ADVERSARIAL VULNERABLE - the specifier spelled with backticks and no
 * interpolation left in it, which is what an inlined template leaves behind. A
 * backtick string is the same constant as a quoted one (CWE-1104).
 */
const CryptoJS = require(`crypto-js`);

exports.md5 = (value) => CryptoJS.MD5(value).toString();
