/**
 * SAFE - `const { origin } = new URL(location.href)`. The container holds
 * inbound text, but `origin` is the browser-normalised CURRENT origin and
 * cannot send anyone anywhere new.
 *
 * This fixture exists because the fix that taught `utils/url-taint.ts` to see
 * URL containers made it a finding: the binding resolver hands a destructured
 * name the WHOLE initialiser, so `origin` resolved to the `URL` and inherited
 * its taint. A false positive introduced by a recall fix, in a rule that was
 * not the one being changed.
 */
export function callbackUrl() {
  const { origin } = new URL(location.href);
  location.assign(origin + '/done');
}
