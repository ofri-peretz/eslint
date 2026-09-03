/**
 * SAFE - The helper hands ownership to its caller by returning the handle. This
 * file cannot see the caller, and reporting a helper that correctly delegates
 * cleanup is a false positive in exactly the well-factored code most likely to
 * be doing it right.
 */
export function createPreviewUrl(file) {
  return URL.createObjectURL(file);
}
