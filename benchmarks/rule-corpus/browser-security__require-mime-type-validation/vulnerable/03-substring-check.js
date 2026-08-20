/**
 * VULNERABLE - `includes` is weaker still: `text/html;name=image/png` passes.
 */
export function acceptDocument(file) {
  if (file.type.includes('application/')) {
    return store(file);
  }
  return null;
}
