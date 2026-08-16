/**
 * SAFE - A protocol-relative URL chooses no scheme of its own.
 */
export function loadLib() {
  return fetch('//cdn.acme-corp.io/lib.json');
}
