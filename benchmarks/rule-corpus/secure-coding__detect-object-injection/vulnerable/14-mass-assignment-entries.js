/**
 * VULNERABLE - the same weakness in its more idiomatic spelling.
 *
 * `Object.entries` avoids the second lookup, and the loop binding is an
 * ArrayPattern rather than an Identifier — a detector that only reads the
 * Identifier form misses the version people actually write.
 */
export function patchSettings(req, settings) {
  for (const [key, value] of Object.entries(req.body)) {
    settings[key] = value;
  }
}
