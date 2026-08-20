/**
 * VULNERABLE - The imperative spelling of the same load. `.src` is a
 * subresource on every element that has one, so no type information is needed
 * to know this is a fetch.
 */
export function injectWidget(container) {
  const script = document.createElement('script');
  script.src = 'http://widgets.acme-corp.io/embed.js';
  container.appendChild(script);
}
