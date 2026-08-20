/**
 * VULNERABLE - The check that looks right and is not. `image/svg+xml` satisfies
 * a prefix test for `image/`, and an SVG served back from the same origin
 * executes whatever script it carries.
 */
export function acceptImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('images only');
  }
  return uploadToBucket(file);
}
