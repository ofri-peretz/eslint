/** VULNERABLE - ADVERSARIAL. The header name lowercased, as HTTP/2 requires
 *  on the wire. Case must not decide a security verdict. */
export function GET() {
  return new Response('{}', {
    headers: { 'access-control-allow-origin': '*' },
  });
}
