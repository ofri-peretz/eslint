/**
 * SAFE - The scheme appears inside a diagnostic STRING, not in a load.
 */
export function warnOnce(url) {
  if (!url.startsWith('https://')) {
    console.warn('Refusing to load http:// subresource:', url);
  }
}
