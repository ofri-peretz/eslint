/**
 * VULNERABLE - ADVERSARIAL. `HTTP://` is a valid URL scheme: schemes are ASCII
 * case-insensitive and the browser loads this exactly like the lowercase form.
 * A rule that tests `startsWith('http://')` is defeated by the shift key.
 */
const script = document.createElement('script');
script.src = 'HTTP://cdn.acme-corp.io/lib.js';
