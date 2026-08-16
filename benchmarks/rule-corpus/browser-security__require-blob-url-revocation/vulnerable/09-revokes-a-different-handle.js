/**
 * VULNERABLE - ADVERSARIAL. A revocation IS present, and it releases the
 * PREVIOUS handle. The new one is never released. A rule that merely checks
 * "does this file call revokeObjectURL" is satisfied by this.
 */
let currentUrl = null;

export function swapPreview(file) {
  const nextUrl = URL.createObjectURL(file);
  URL.revokeObjectURL(currentUrl);
  document.querySelector('#preview').src = nextUrl;
}
