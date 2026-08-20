/**
 * SAFE - The URL passes through a helper, which is the shape that defeats a
 * naive "literal next to a sink" match. The helper returns HTTPS.
 */
function cdn(path) {
  return `https://cdn.acme-corp.io/${path}`;
}

const el = document.createElement('script');
el.src = cdn('lib/app.js');
