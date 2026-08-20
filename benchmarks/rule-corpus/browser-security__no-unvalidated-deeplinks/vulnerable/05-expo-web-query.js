/**
 * VULNERABLE - Expo-for-web builds reach the same sink from the browser's own
 * address bar.
 */
const next = new URLSearchParams(window.location.search).get('next');
Linking.openURL(next);
