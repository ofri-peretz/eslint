/**
 * VULNERABLE - a `<link rel="stylesheet">` from cdnjs with no integrity hash.
 * A stylesheet is not inert: it can exfiltrate form contents through attribute
 * selectors and background-image URLs, which is why SRI covers `<link>` at all.
 */
export function emailLayout(inner) {
  return `
    <html>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css">
      </head>
      <body>${inner}</body>
    </html>
  `;
}
