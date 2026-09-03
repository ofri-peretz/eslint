/**
 * VULNERABLE - a LOCAL function wearing a trusted name. `encrypt` here is a
 * placeholder somebody left behind: it returns its input. The token is stored
 * in cleartext, and any check that accepts "the value passed through something
 * called encrypt" is satisfied by it.
 */
// TODO: swap for the real KMS call before launch
const encrypt = (value) => value;

export function cacheSessionToken(token) {
  sessionStorage.setItem('sessionToken', encrypt(token));
}
