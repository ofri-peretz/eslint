/**
 * SAFE - Optional chaining on the FileList, with the allowlist still enforced.
 */
const ALLOWED = new Set(['text/csv']);

export async function importCsv(input) {
  const file = input.files?.[0];
  if (file === undefined || !ALLOWED.has(file.type)) return null;
  const body = new FormData();
  body.append('rows', file);
  return fetch('/api/import', { method: 'POST', body });
}
