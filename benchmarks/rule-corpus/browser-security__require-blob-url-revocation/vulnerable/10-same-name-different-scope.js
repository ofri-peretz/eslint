/**
 * VULNERABLE - ADVERSARIAL. Two sibling helpers, both naming their handle
 * `objectUrl`; only the first releases it. A file-wide map keyed on the NAME
 * marks the second one released too, and the leak disappears from the report.
 */
export function exportCsv(rows) {
  const objectUrl = URL.createObjectURL(new Blob([rows]));
  triggerDownload(objectUrl);
  URL.revokeObjectURL(objectUrl);
}

export function exportPdf(bytes) {
  const objectUrl = URL.createObjectURL(new Blob([bytes]));
  triggerDownload(objectUrl);
}
