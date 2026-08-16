/** VULNERABLE - an edge Route Handler. The header block is an object literal
 *  rather than a sequence of calls. */
export function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
