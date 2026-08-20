/**
 * SAFE - `delete` on ordinary properties. This is the shape that produced 120
 * findings across a 1,470-file corpus when the rule was a `delete` detector
 * rather than a secret-cleanup detector.
 */
function normalizeOptions(options) {
  delete options.cacheable;
  delete options.timeout;
  delete options.displayName;
  delete options.children;
  return options;
}

module.exports = { normalizeOptions };
