/**
 * SAFE - script and link tags whose hosts are first-party or same-origin,
 * written the same way as the vulnerable fixtures so the only difference is
 * where the bytes come from.
 */
export function legacyPage(nonce) {
  return `
    <html>
      <head>
        <link rel="stylesheet" href="https://static.internal.example.com/css/app.4f2a.css">
        <script src="https://app.example.com/js/vendor.9c1d.js" defer></script>
        <script src="/js/main.7b3e.js" nonce="${nonce}"></script>
      </head>
      <body></body>
    </html>
  `;
}
