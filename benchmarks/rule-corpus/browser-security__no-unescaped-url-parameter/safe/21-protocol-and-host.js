/**
 * SAFE (wave 2) - `location.protocol` and `location.host` in a QUERY position.
 * They are still the current origin's components, still browser-normalised, and
 * still not something anyone else chose.
 */
export function beacon() {
  return `https://metrics.example.com/v1/hit?scheme=${location.protocol}&host=${location.host}`;
}
