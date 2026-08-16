/**
 * VULNERABLE - The path is reached through an array index into a list the server
 * supplied.
 */
export async function registerVariant(index) {
  const variants = await (await fetch('/api/sw-variants')).json();
  await navigator.serviceWorker.register(variants[index]);
}
