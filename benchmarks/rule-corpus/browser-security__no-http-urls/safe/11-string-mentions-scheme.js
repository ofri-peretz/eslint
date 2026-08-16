/**
 * SAFE - The scheme appears inside an error MESSAGE, not a destination.
 */
export function assertScheme(url) {
  if (!url.startsWith('https://')) {
    throw new Error('Expected https://, refusing to use http:// endpoint');
  }
}
