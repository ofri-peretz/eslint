/**
 * VULNERABLE - The key says nothing, but the VALUE is a JWT: three base64url
 * segments whose header decodes to a JOSE header with an alg claim.
 */
export function seedDemoUser() {
  localStorage.setItem('profile', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxOTAwMDAwMDAwfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
}
