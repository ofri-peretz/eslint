/**
 * VULNERABLE - `window.document.cookie` is the same sink.
 */
window.document.cookie = 'ab_variant=b';
