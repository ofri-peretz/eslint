/**
 * SAFE - `hasConsent === false` reads the same way as `!hasConsent`, and the
 * guarded branch is the one where consent was refused.
 */
export function report(event) {
  if (hasConsent === false) {
    return;
  }
  analytics.track(event);
}
