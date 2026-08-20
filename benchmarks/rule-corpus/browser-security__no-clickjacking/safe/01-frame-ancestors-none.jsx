/** SAFE - the CORRECT modern remediation: a CSP that forbids framing
 *  outright. Nothing may embed this document. */
export default function Document() {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; frame-ancestors 'none'"
        />
      </head>
      <body>
        <div id="root" />
      </body>
    </html>
  );
}
