/** SAFE - the same <meta http-equiv> shell as vulnerable/03 with the unsafe
 *  directive removed. If this reports, the rule is keying on the meta tag
 *  rather than on the policy. */
export default function Document() {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self'; object-src 'none'"
        />
      </head>
      <body>
        <div id="root" />
      </body>
    </html>
  );
}
