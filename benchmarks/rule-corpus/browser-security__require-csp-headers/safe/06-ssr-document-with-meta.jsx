/** SAFE - server-side rendering a shell that carries its policy as a
 *  <meta http-equiv>. The browser gets a CSP; it simply did not arrive as a
 *  response header. */
function Document() {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; object-src 'none'"
        />
      </head>
      <body>
        <div id="root" />
      </body>
    </html>
  );
}

app.get('/', (req, res) => {
  res.send(renderToStaticMarkup(<Document />));
});
