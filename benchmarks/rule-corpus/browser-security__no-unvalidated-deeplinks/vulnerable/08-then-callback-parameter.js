/**
 * VULNERABLE - The promise callback's parameter IS the launch URL, and the
 * value survives being read from an inner closure.
 */
Linking.getInitialURL().then((u) => {
  [1].forEach(() => Linking.openURL(u));
});
