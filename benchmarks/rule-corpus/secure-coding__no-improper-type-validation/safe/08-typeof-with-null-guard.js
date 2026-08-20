/**
 * SAFE - The remediation the rule's `unsafeTypeofCheck` message asks for, word
 * for word: `value != null && typeof value === 'object'`, plus the array test
 * that closes the other hole.
 */
export function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function mergeSettings(target, patch) {
  if (!isPlainObject(patch)) {
    throw new TypeError('patch must be a plain object');
  }
  return { ...target, ...patch };
}
