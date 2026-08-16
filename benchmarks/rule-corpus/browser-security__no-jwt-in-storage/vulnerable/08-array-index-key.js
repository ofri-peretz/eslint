/**
 * VULNERABLE - The key comes from an array index and cannot be resolved, so the
 * only evidence left is the value — which is a JWT.
 */
const KEYS = ['a', 'b'];
localStorage.setItem(KEYS[0], 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxOTAwMDAwMDAwfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
