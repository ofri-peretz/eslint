/**
 * VULNERABLE - two tags carry `integrity`, three do not. This is the real
 * shape from Shopify/cli's graphiql template: the protected React bundles sit
 * beside unprotected app and stylesheet tags in the same document. Asking
 * whether "integrity appears anywhere in this template" is a suppression, not
 * a check.
 */
export function graphiqlPage(apiUrl) {
  return `
    <!doctype html>
    <html>
      <head>
        <script
          src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"
          integrity="sha512-6a1077e1bd9a1d0a4a5c1d7e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b"
          crossorigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"
          integrity="sha512-1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"
          crossorigin="anonymous"
        ></script>
        <script src="https://cdn.jsdelivr.net/npm/graphiql@3.0.6/graphiql.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphiql@3.0.6/graphiql.min.css">
      </head>
      <body><div id="graphiql" data-api="${apiUrl}"></div></body>
    </html>
  `;
}
