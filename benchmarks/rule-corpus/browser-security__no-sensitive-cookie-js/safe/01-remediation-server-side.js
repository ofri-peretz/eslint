/**
 * SAFE - The remediation. The secret is posted once and never stored in the
 * browser.
 */
export async function verify(ssn) {
  await fetch('/api/kyc', { method: 'POST', body: JSON.stringify({ ssn }) });
}
