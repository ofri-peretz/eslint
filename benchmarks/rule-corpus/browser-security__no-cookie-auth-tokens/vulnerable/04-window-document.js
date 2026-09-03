/**
 * VULNERABLE - `window.document.cookie` is the same sink.
 */
window.document.cookie = 'session_id=' + id + '; Secure; SameSite=Strict';
