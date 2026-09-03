/**
 * VULNERABLE - One binding between the source and the sink.
 */
const raw = await fetch('/api/bio').then(r => r.text());
const markup = raw;
document.querySelector('#bio').innerHTML = markup;
