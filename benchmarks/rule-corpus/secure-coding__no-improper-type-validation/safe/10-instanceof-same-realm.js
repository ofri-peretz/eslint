/**
 * SAFE (adversarial) - `instanceof` against classes constructed in this very
 * realm. There is no cross-realm hazard: the URL and the Buffer were both made
 * by this process, and the check is followed by a real rejection path.
 */
export function describeTarget(input) {
  if (input instanceof URL) {
    return { kind: 'url', host: input.host };
  }
  if (input instanceof Buffer) {
    return { kind: 'buffer', bytes: input.length };
  }
  if (typeof input === 'string') {
    return { kind: 'string', bytes: Buffer.byteLength(input) };
  }
  throw new TypeError('unsupported target');
}
