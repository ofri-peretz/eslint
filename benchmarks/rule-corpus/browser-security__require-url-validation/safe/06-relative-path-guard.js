/**
 * SAFE - The other correct remediation: refuse anything that is not a
 * site-relative path. Both halves are needed — `//evil.test` starts with `/`.
 */
const next = new URLSearchParams(location.search).get('next');
window.open(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
