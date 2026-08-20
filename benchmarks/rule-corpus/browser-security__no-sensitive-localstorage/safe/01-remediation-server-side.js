/**
 * SAFE - The remediation. The secret never reaches the browser; the client asks
 * the server to use it.
 */
export async function callThirdParty(payload) {
  return fetch('/api/proxy/third-party', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
