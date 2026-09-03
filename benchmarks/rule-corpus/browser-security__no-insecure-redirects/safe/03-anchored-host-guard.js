/**
 * SAFE - An anchored, fully escaped host pattern pins the WHOLE string.
 * `https://app.acme-corp.io.evil.test` fails it; an unanchored pattern or an
 * unescaped dot would not, which is the entire CWE-020 bypass cluster.
 */
const ALLOWED_ORIGIN = /^https:\/\/app\.acme-corp\.io$/;
const next = new URLSearchParams(location.search).get('next');
window.location.href = ALLOWED_ORIGIN.test(next) ? next : '/';
