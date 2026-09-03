/**
 * ADVERSARIAL SAFE - the dynamic-import path the fix just opened, pointed at a
 * LOCAL adapter. A relative specifier is not a package however it is spelled.
 */
export async function decryptArchive(blob, key) {
  const { decrypt } = await import('./legacy/crypto-js-adapter.js');
  return decrypt(blob, key);
}
