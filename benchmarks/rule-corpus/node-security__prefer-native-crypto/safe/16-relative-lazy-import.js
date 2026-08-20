/**
 * ADVERSARIAL SAFE - the dynamic-import path the fix just opened, pointed at a
 * LOCAL adapter. A relative specifier is not a package.
 */
export async function openLegacyVault(blob, passphrase) {
  const { decrypt } = await import('./legacy/sjcl-adapter.js');
  return decrypt(passphrase, blob);
}
