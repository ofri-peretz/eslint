/**
 * VULNERABLE - The global spelled out. `window.URL` is `URL`; inside a worker
 * `self.URL` is the only spelling available.
 */
export function openReport(blob) {
  const reportUrl = window.URL.createObjectURL(blob);
  window.open(reportUrl, '_blank');
}
