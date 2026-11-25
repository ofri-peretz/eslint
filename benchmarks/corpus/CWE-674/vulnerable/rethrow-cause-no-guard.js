// CWE-674: Uncontrolled Recursion — a cause-chain walk with no visited set
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// This MUST be detected — shape of Next.js 16.4.6 unstable_rethrow. Called on
// an error whose cause points back to itself (err.cause = err), it recurses
// until RangeError: Maximum call stack size exceeded, from inside a catch.
function isFrameworkError(error) {
  return error instanceof Error && error.digest === 'FRAMEWORK';
}

function rethrowFrameworkError(error) {
  if (isFrameworkError(error)) throw error;
  if (error instanceof Error && 'cause' in error) {
    rethrowFrameworkError(error.cause);
  }
}

module.exports = { rethrowFrameworkError };
