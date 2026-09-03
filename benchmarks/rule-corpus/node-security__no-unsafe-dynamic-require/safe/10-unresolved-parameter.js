/**
 * SAFE (adversarial) - a bare parameter. The rule documents exactly this case:
 * "`require(specifier)` where `specifier` is a bare parameter is now silent —
 * that is a caller-side decision this rule cannot see", restorable with
 * `reportUnresolvedSpecifiers`. The parameter is named `request` because that
 * is what webpack's resolver API calls it.
 */
module.exports = function resolveLoader(request) {
  return require(request);
};
