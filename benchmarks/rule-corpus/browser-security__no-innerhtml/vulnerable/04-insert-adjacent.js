/**
 * VULNERABLE - insertAdjacentHTML parses its second argument as HTML.
 */
const row = await res.json();
document.querySelector('tbody').insertAdjacentHTML('beforeend', row.html);
