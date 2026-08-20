/**
 * SAFE - The sink name appears only in a comment.
 */
// Never assign window.location.href from location.search without an allowlist.
const next = new URLSearchParams(location.search).get('next');
logAnalytics('redirect_requested', next);
