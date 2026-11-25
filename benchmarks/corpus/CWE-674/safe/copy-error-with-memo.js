// The copyError shape after the fix: a map of copies made so far ends a cycle.
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
function copyError(source, copies = new Map()) {
  const existing = copies.get(source);
  if (existing !== undefined) return existing;
  const target = Object.assign(
    Object.create(Object.getPrototypeOf(source)),
    source,
  );
  copies.set(source, target);
  let { cause } = source;
  if (cause instanceof Error) {
    cause = copyError(cause, copies);
  }
  Object.defineProperty(target, 'cause', { value: cause });
  return target;
}

module.exports = { copyError };
