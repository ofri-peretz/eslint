/**
 * VULNERABLE - Credentials in the URL handed to fetch. They land in the
 * referrer, in proxy logs and in the browser's history.
 */
export async function loadReport() {
  const res = await fetch('https://reporting:s3cr3t@api.acme-corp.io/v1/reports');
  return res.json();
}
