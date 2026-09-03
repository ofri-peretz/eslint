/**
 * SAFE - ADVERSARIAL. `<link rel="canonical">` declares an IDENTITY, it does
 * not load anything — no request is made, so there is no mixed content and no
 * remediation to offer. Only fetching rels (stylesheet, preload, prefetch,
 * icon, manifest, modulepreload) are subresources. A rule that keys on the
 * element+attribute pair alone reports every canonical tag in every SSR app.
 */
export function Head({ path }) {
  return <link rel="canonical" href={`http://acme-corp.io${path}`} />;
}
