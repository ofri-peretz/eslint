/**
 * VULNERABLE - ADVERSARIAL. Anchored at both ends, but the dots are unescaped,
 * so `.` matches any character and `https://appXacme-corpXio` passes.
 */
const next = new URLSearchParams(location.search).get('next');
window.location.href = /^https:\/\/app.acme-corp.io$/.test(next) ? next : '/';
