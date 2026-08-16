/**
 * VULNERABLE - The canonical open redirect: an OAuth callback bounces the user
 * to a `returnTo` it read straight out of its own query string.
 */
export function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  window.location.href = returnTo;
}
