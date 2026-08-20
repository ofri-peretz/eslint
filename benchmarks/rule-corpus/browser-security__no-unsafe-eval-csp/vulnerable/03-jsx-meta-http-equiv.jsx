/** VULNERABLE - a CSP delivered as a <meta http-equiv> in the document shell.
 *  This is the browser-native way to ship a policy with no server involved,
 *  and it is the shape a browser-scoped rule most needs to see. */
export default function Document() {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval'"
        />
      </head>
      <body>
        <div id="root" />
      </body>
    </html>
  );
}
