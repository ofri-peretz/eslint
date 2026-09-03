/**
 * SAFE - The correct remediation: release in a `finally`, so an exception in the
 * middle of the download cannot strand the handle.
 */
export function downloadCsv(rows) {
  const url = URL.createObjectURL(new Blob([rows.join('\n')]));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'export.csv';
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
