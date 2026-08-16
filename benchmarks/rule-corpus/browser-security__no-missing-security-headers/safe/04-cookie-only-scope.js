/** SAFE - a scope that touches only a transport concern renders no document,
 *  so there is nothing to frame or inject into. */
export function setSession(res, token) {
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; Secure; SameSite=Strict`);
}
