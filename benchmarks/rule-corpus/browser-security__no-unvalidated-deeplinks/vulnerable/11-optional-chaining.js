/**
 * VULNERABLE - ADVERSARIAL. Optional chaining on the sink, because
 * `Linking` is undefined on web in some Expo configurations.
 */
Linking.addEventListener('url', (event) => {
  Linking?.openURL(event?.url);
});
