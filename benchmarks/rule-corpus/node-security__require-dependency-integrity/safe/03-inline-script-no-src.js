/**
 * SAFE - inline scripts and styles. Nothing is fetched over the network, so
 * there are no bytes for a hash to describe; SRI does not apply to inline
 * content at all.
 */
export function bootstrapState(state, nonce) {
  return `
    <script nonce="${nonce}">window.__STATE__ = ${JSON.stringify(state)};</script>
    <style>body { margin: 0; font-family: system-ui, sans-serif; }</style>
    <script type="application/ld+json">{"@context":"https://schema.org"}</script>
  `;
}
