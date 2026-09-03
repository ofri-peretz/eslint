/**
 * SAFE - The CORRECT remediation: the credential travels in a header, which is
 * not logged by proxies and not stored in history.
 */
export async function loadReport(token) {
  return fetch('https://api.acme-corp.io/v1/reports', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
