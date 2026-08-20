/**
 * SAFE - A single accepted type, compared for equality.
 */
export function acceptPdf(file) {
  if (file.type !== 'application/pdf') {
    throw new Error('PDF only');
  }
  return store(file);
}
