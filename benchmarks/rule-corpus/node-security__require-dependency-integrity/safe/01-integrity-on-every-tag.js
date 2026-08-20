/**
 * SAFE - the remediation the rule's own message asks for: every CDN-served
 * tag carries `integrity` and `crossorigin`. This is the mirror of
 * vulnerable/04 with the three unprotected tags fixed.
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
          src="https://cdn.jsdelivr.net/npm/graphiql@3.0.6/graphiql.min.js"
          integrity="sha384-abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
          crossorigin="anonymous"
        ></script>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/graphiql@3.0.6/graphiql.min.css"
          integrity="sha384-9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"
          crossorigin="anonymous"
        >
      </head>
      <body><div id="graphiql" data-api="${apiUrl}"></div></body>
    </html>
  `;
}
