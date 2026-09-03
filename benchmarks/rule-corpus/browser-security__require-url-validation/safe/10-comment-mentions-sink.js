/**
 * SAFE - The sink name appears only in a comment.
 */
// Do not call window.open(params.get('next')) without an allowlist.
const next = new URLSearchParams(location.search).get('next');
recordIntent(next);
