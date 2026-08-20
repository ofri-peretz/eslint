/**
 * VULNERABLE - A partial mitigation: the IV is "generated" rather than typed
 * out, but it is a pure function of the key, so it is identical on every call.
 * CWE-329 asks whether the IV is UNPREDICTABLE, not whether it was written by
 * hand. Included deliberately as the hardest realistic shape — a miss here is
 * a semantic false negative, not a syntactic one.
 */
const crypto = require('node:crypto');

const KEY = Buffer.from(process.env.PROFILE_KEY, 'hex');
const IV = crypto.createHash('sha256').update(KEY).digest().subarray(0, 16);

/** Express route: encrypt a user profile blob. */
function encryptProfile(profile) {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
  return Buffer.concat([cipher.update(JSON.stringify(profile), 'utf8'), cipher.final()]);
}

module.exports = { encryptProfile };
