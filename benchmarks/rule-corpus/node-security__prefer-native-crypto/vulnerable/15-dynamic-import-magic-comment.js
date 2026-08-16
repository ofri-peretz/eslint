/**
 * ADVERSARIAL VULNERABLE - a bundler magic comment in front of the specifier,
 * on a lazily-loaded legacy decryption path (CWE-1104).
 */
export async function openLegacyVault(blob, passphrase) {
  const sjcl = await import(/* webpackChunkName: "legacy-sjcl" */ 'sjcl');
  return sjcl.decrypt(passphrase, blob);
}
