/**
 * SAFE - The sink name appears only in a comment.
 */
// Never call Linking.openURL(event.url) without an allowlist of schemes.
const initial = await Linking.getInitialURL();
logDeepLink(initial);
