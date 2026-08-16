/**
 * SAFE - Reading is not storing. The credential was put there by somebody else's
 * defect, and re-reporting it here would double-count.
 */
export function currentToken() {
  return localStorage.getItem('access_token');
}
