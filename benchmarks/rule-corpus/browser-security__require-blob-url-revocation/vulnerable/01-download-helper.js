/**
 * VULNERABLE - The classic CSV export. The handle pins the whole Blob in memory
 * for the lifetime of the document, and this helper runs once per export click.
 */
export function downloadCsv(rows) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'export.csv';
  anchor.click();
}
