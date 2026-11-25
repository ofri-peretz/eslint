// CWE-674: Uncontrolled Recursion — copying an error and its cause chain
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// This MUST be detected — shape of Node.js copyError before the fix for
// nodejs/node#67572: assert.deepStrictEqual on a self-referencing cause threw
// RangeError instead of an AssertionError.
function copyError(source) {
  const target = Object.assign(
    Object.create(Object.getPrototypeOf(source)),
    source,
  );
  let { cause } = source;
  if (cause instanceof Error) {
    cause = copyError(cause);
  }
  Object.defineProperty(target, 'cause', { value: cause });
  return target;
}

module.exports = { copyError };
