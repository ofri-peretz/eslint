/**
 * SAFE - The idiom Vite, webpack 5 and Parcel all prescribe. The bundler
 * rewrites this at build time into a hashed same-origin asset path; it is as
 * static as a string literal, and it is the RECOMMENDED spelling.
 */
navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), {
  type: 'module',
});
