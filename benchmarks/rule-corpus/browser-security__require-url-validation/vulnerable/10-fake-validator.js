/**
 * VULNERABLE - ADVERSARIAL. `safe/07` defers to a validator whose source we do
 * not have. This one is right here, and it returns its input.
 */
const toSafeExternalUrl = (u) => u;
window.open(toSafeExternalUrl(new URLSearchParams(location.search).get('next')));
