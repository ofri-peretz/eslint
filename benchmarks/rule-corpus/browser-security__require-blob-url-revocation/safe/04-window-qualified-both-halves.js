/**
 * SAFE - ADVERSARIAL. Created and released through the qualified global. When
 * only a bare `URL` identifier counted, the creation was invisible AND the
 * revocation was invisible — so a file that spelled just one of them out was
 * reported for a leak it had already fixed.
 */
export function openReport(blob) {
  const reportUrl = window.URL.createObjectURL(blob);
  window.open(reportUrl, '_blank');
  window.URL.revokeObjectURL(reportUrl);
}
