/**
 * VULNERABLE - A hand-rolled hash router navigates to whatever follows the `#`.
 * Stripping the leading character does not constrain the origin.
 */
window.addEventListener('hashchange', () => {
  location.assign(location.hash.slice(1));
});
