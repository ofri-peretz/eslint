/**
 * VULNERABLE - ADVERSARIAL. URL schemes are ASCII case-insensitive, so this
 * request is cleartext exactly like the lowercase form. Legacy URLs are both
 * the most likely to be written this way AND the most likely to still be http.
 */
export function legacy() {
  return fetch('HTTP://legacy.acme-corp.io/v1/report');
}
