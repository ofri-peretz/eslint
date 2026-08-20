/**
 * SAFE - An exported function interpolating an unknowable parameter into a
 * string that is not a URL at all. Without a URL shape there is no encoding
 * contract to break.
 */
export function greeting(name) {
  return `Welcome back, ${name}!`;
}
