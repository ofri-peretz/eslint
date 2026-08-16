/**
 * VULNERABLE - The warm-start entry point. `event.url` on a `'url'` listener
 * is the inbound deep link; the parameter's spelling is irrelevant.
 */
Linking.addEventListener('url', (e) => {
  Linking.openURL(e.url);
});
