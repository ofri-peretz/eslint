/**
 * SAFE - The protocol appears inside an error MESSAGE, not a destination.
 */
export function explain() {
  return 'Connection strings must not use redis:// or mysql://; use the TLS variants.';
}
