/**
 * SAFE - The sink and the defective check appear only in a comment.
 */
// Never file.type.startsWith('image/') — image/svg+xml passes and runs script.
const ALLOWED = new Set(['image/png']);

export function accept(file) {
  return ALLOWED.has(file.type) ? file : null;
}
