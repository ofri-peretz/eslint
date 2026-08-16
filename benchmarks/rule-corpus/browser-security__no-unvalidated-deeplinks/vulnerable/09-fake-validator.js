/**
 * VULNERABLE - ADVERSARIAL. A LOCAL function wearing a validator's name that
 * returns its input unchanged. `safe/04` is the same shape with a validator we
 * genuinely cannot read; the difference is whether the source is in front of us.
 */
const toAllowedDeepLink = (u) => u;

Linking.addEventListener('url', (event) => {
  Linking.openURL(toAllowedDeepLink(event.url));
});
