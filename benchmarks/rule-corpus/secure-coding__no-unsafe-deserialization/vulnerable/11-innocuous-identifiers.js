/**
 * VULNERABLE (adversarial) - The FALSE-NEGATIVE direction: the node-serialize
 * RCE with every identifier renamed to a word that suggests nothing. The import
 * is unchanged, because that is the only thing that actually names the sink.
 */
const codec = require('node-serialize');

exports.restore = function restore(blob) {
  return codec.unserialize(blob);
};
