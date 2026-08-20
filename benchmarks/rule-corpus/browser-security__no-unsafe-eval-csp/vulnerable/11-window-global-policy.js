/** VULNERABLE - the policy handed to a window-scoped bootstrap. `window.`
 *  prefixing changes nothing about the directive being shipped. */
window.__CSP__ = "default-src 'self'; script-src 'self' 'unsafe-eval'";

window.applySecurityPolicy(window.__CSP__);
