/** SAFE - ADVERSARIAL. The header block is spread in from a shared constant
 *  that already carries all three. Only the per-request extras are written
 *  out, so the visible keys look dangerously thin. */
const SECURE_DEFAULTS = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

export function GET(request) {
  return new Response('<!DOCTYPE html><html></html>', {
    headers: { ...SECURE_DEFAULTS, 'X-Request-Id': request.headers.get('x-request-id') },
  });
}
