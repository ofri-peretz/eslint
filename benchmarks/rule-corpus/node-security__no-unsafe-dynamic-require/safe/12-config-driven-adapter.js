/**
 * SAFE (adversarial) - the specifier comes from the program's own config file.
 * Its provenance is unresolvable from here, and the rule documents unresolved
 * as silent by default: reporting it is the pre-inversion sweep that produced
 * 14 findings and zero code injections on an 8-repo corpus.
 */
const { adapter } = require('./config.json');

const store = require(adapter);

module.exports = { store };
