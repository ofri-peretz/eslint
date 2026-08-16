/**
 * SAFE - the other correct remediation: vendor the dependency and serve it
 * from your own origin. There is no third party to verify, so SRI is not
 * merely satisfied, it is unnecessary.
 */
export function appShell(assetManifest) {
  return `
    <!doctype html>
    <html>
      <head>
        <link rel="stylesheet" href="/assets/${assetManifest.css}">
        <script type="module" src="/assets/${assetManifest.js}"></script>
      </head>
      <body><div id="root"></div></body>
    </html>
  `;
}
