/**
 * SAFE - Reading and tearing down registrations. Nothing is installed.
 */
export async function reset() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  await navigator.serviceWorker.ready;
}
