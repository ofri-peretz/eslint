/**
 * VULNERABLE - A popup opened at a destination the query string chose.
 * `window.open` is a real navigation into a new browsing context.
 */
const popup = new URLSearchParams(window.location.search).get('popup');
window.open(popup, '_blank');
