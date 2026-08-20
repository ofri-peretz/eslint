/**
 * SAFE (adversarial) - an NLP tokenizer's vocabulary cache. `tokenizer`
 * contains `token`, and a cached word list is not a credential. This is the
 * realistic shape of the false positive, not a contrived one — every project
 * that ships a tokenizer has this file.
 */
const fs = require('node:fs');

function persistVocabulary(tokenizerCachePath, vocabulary) {
  fs.writeFileSync(tokenizerCachePath, JSON.stringify(vocabulary));
}

module.exports = { persistVocabulary };
