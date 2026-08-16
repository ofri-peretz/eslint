/**
 * SAFE - NOT SAFE CODE: not THIS rule's finding. The hole chooses the host, so
 * it is an open redirect (CWE-601) owned by `no-insecure-redirects` /
 * `require-url-validation`. Two rules reporting one line under two CWEs is the
 * partition defect this family already fixed once.
 */
export function tenantUrl(host) {
  return `https://${host}/v1/status`;
}
