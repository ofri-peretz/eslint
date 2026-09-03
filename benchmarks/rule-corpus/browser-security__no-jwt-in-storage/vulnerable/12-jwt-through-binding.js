/**
 * VULNERABLE - The JWT is bound to a const first. Resolving the binding is the
 * difference between seeing it and not.
 */
const seeded = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxOTAwMDAwMDAwfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
window.sessionStorage.setItem('demo_user', seeded);
