/**
 * VULNERABLE (wave 2) - The element comes out of a NodeList by index, and the
 * property is read with a computed key. Two independent ways to lose the same
 * value.
 */
export function suggest() {
  const fields = document.querySelectorAll('input.search');
  return fetch(`https://api.example.com/v1/suggest?p=${fields[0]['value']}`);
}
