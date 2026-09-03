/**
 * VULNERABLE - ADVERSARIAL. `canOpenURL` asks whether some app claims the
 * scheme. It is a capability probe, not an authorization check, so guarding
 * with it authorizes nothing.
 */
Linking.addEventListener('url', (event) => {
  Linking.canOpenURL(event.url).then((supported) => {
    if (supported) {
      Linking.openURL(event.url);
    }
  });
});
