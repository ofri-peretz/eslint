/**
 * SAFE - Textbook "scary shape, linear behaviour": a quantifier inside a
 * quantifier, `(\d{1,3}\.){3}`. Both bounds are finite and small, so the total
 * work is bounded by 3 x 3 regardless of input length. A rule that reports on
 * nesting alone reports this.
 */
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const MAC = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

export function classifyAddress(value) {
  if (IPV4.test(value)) return 'ipv4';
  if (MAC.test(value)) return 'mac';
  return 'unknown';
}
