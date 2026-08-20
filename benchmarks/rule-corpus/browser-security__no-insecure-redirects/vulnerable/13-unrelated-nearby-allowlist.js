/**
 * VULNERABLE - ADVERSARIAL. There IS an `.includes(` five lines up, and it has
 * nothing to do with the redirect. The old scan read the previous five sibling
 * statements as TEXT and suppressed on any of them mentioning a check.
 */
const featureFlags = ['beta-nav', 'dark-mode'];
const hasBetaNav = featureFlags.includes('beta-nav');
const next = new URLSearchParams(location.search).get('returnTo');
window.location.href = next;
