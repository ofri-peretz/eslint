/**
 * ADVERSARIAL VULNERABLE - a bundler magic comment sits between the paren and
 * the specifier, so the argument's first token is not the string. The module
 * loaded is still crypto-js (CWE-1104).
 */
export async function decryptArchive(blob, key) {
  const { AES, enc } = await import(/* webpackChunkName: "legacy-crypto" */ 'crypto-js');
  return AES.decrypt(blob, key).toString(enc.Utf8);
}
