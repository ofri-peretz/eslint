// A depth bound, checked and passed on, ends the walk on any chain.
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
function flattenError(err, depth = 0) {
  if (depth >= 16) return '…';
  return err.cause instanceof Error
    ? `${err.message}: ${flattenError(err.cause, depth + 1)}`
    : err.message;
}

module.exports = { flattenError };
