/**
 * VULNERABLE - The cold-start entry point. Whatever URL launched the app is
 * handed straight back to the OS scheme handler, which will open whichever app
 * claims that scheme.
 */
export async function bootstrap() {
  const initial = await Linking.getInitialURL();
  Linking.openURL(initial);
}
