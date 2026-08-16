/**
 * SAFE — the pattern is assembled, but every part of it is a module constant.
 *
 * `SUPPORTED_EXTENSIONS.join('|')` compiles to the same string on every run of
 * every process. Nothing outside the program can change it. This is the single
 * most common shape misreported by "is the argument a Literal node?" checks, and
 * it is why this rule resolves bindings instead of inspecting node types.
 */
const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'avif'];

export const IMAGE_FILE = new RegExp(`\\.(${SUPPORTED_EXTENSIONS.join('|')})$`, 'i');

export function isImage(filename) {
  return IMAGE_FILE.test(filename);
}
