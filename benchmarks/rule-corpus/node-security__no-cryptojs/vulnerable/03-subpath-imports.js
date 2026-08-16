/**
 * VULNERABLE - the tree-shakeable subpath spelling. `crypto-js/aes` is the same
 * unmaintained package as `crypto-js`; importing one file out of it does not
 * change who maintains it (CWE-1104).
 */
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

export function unseal(blob, key) {
  return AES.decrypt(blob, key).toString(Utf8);
}
