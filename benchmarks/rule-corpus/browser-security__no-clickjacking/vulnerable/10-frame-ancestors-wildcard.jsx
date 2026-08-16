/** VULNERABLE - ADVERSARIAL. A CSP that names frame-ancestors and then allows
 *  EVERYONE. It reads like protection and grants none, so a rule that treats
 *  the presence of the directive as the fix is silenced by the vulnerability. */
export default function Document() {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; frame-ancestors *"
        />
      </head>
      <body><div id="root" /></body>
    </html>
  );
}
