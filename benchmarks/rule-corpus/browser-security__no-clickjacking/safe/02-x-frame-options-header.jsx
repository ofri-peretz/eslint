/** SAFE - the legacy remediation, still required for clients that predate
 *  frame-ancestors. */
export const headers = [{ key: 'X-Frame-Options', value: 'DENY' }];

export default function Document() {
  return (
    <html lang="en">
      <head><title>App</title></head>
      <body><div id="root" /></body>
    </html>
  );
}
