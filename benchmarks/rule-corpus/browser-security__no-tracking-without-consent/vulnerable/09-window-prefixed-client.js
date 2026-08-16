/**
 * VULNERABLE - ADVERSARIAL. `window.analytics` is how Segment's own snippet
 * installs the client. A bare-identifier check never sees it.
 */
window.analytics.track('Signup Completed');
