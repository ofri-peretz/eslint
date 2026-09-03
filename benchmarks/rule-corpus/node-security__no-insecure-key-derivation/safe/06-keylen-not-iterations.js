/**
 * SAFE - positional probe. The small number here is the KEY LENGTH (32 bytes),
 * the fourth argument; iterations is 600,000. A rule that judged "the small
 * literal" rather than "argument index 2" would report this.
 */
const { pbkdf2Sync } = require('node:crypto');

exports.derive = (password, salt) => pbkdf2Sync(password, salt, 600000, 32, 'sha256');
