/**
 * SAFE - Writing `location.hash` scrolls within the current document. It
 * cannot leave the origin, so it is not CWE-601.
 */
window.location.hash = new URLSearchParams(location.search).get('section');
