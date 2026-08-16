/**
 * SAFE - The sink and the scheme appear only in a comment.
 */
// Never set img.src to an http:// URL here; the CDN is HTTPS-only.
const img = document.querySelector('#hero');
img.src = '/static/hero.png';
