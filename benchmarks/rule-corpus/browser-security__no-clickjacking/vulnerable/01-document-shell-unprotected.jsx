/** VULNERABLE - the app's document shell establishes no frame protection at
 *  all: no frame-ancestors, no X-Frame-Options, no frame-busting. Anyone can
 *  put this application inside their own page. */
export default function Document() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Bank</title>
      </head>
      <body>
        <div id="root" />
      </body>
    </html>
  );
}
