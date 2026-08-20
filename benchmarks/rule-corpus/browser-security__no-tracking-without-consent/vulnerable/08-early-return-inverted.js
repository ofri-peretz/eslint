/**
 * VULNERABLE - The early-return guard with the sense backwards: this function
 * returns when consent WAS given and tracks when it was not.
 */
export function boot() {
  if (gdprConsent) return;
  analytics.track('App Booted');
}
