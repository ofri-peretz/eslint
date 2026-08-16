/**
 * SAFE - A loopback origin is potentially trustworthy per the Secure Contexts
 * spec, so no browser blocks or flags it from an HTTPS page. Pointing a dev
 * preview at the local server is ordinary, and reporting it describes browser
 * behaviour that does not exist.
 */
const preview = document.getElementById('preview');
preview.src = 'http://localhost:3000/preview.png';
