/**
 * SAFE - The sink appears only in a comment.
 */
// Do not gate on localStorage.getItem('isAdmin'); ask the server instead.
const permissions = await fetch('/api/me/permissions').then((r) => r.json());
render(permissions);
