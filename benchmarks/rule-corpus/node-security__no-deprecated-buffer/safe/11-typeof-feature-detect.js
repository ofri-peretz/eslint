/**
 * SAFE (adversarial) - `Buffer` appears as a bare identifier in a `typeof`
 * feature detection and as the receiver of `Buffer.from`. Neither is a
 * construction. Isomorphic packages open with exactly this block.
 */
export function toBytes(value) {
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    return Buffer.from(value, 'utf8');
  }
  return new TextEncoder().encode(value);
}
