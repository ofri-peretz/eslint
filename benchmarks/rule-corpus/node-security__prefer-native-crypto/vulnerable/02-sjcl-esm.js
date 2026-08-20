/**
 * VULNERABLE - SJCL for AES-CCM in a Node service. node:crypto exposes AES-GCM
 * through createCipheriv, so the library adds an unaudited dependency for no
 * capability (CWE-1104).
 */
import sjcl from 'sjcl';

export function seal(plaintext, passphrase) {
  return sjcl.encrypt(passphrase, plaintext);
}
