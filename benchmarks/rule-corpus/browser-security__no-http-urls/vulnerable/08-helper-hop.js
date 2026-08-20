/**
 * VULNERABLE - The URL passes through a helper before use, the shape that
 * defeats a rule looking for a literal adjacent to a sink.
 */
function legacyBase() {
  return 'http://legacy.acme-corp.io';
}

export function legacyPath(path) {
  return legacyBase() + path;
}
