/** VULNERABLE - an edge / Route Handler response. The headers are an object
 *  literal rather than a sequence of calls, but the wire result is identical
 *  and just as incomplete. */
export function GET() {
  return new Response('<!DOCTYPE html><html><body>Edge</body></html>', {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'DENY',
    },
  });
}
