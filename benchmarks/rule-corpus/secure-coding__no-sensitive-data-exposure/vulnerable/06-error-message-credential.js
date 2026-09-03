/**
 * VULNERABLE - The credential is embedded in an exception message, which is
 * then serialised into the error log and, in many stacks, into the HTTP
 * response body as well.
 */
export function assertSigningKey(privateKey) {
  if (privateKey.length < 32) {
    throw new Error('private_key: ' + privateKey);
  }
  return privateKey;
}
