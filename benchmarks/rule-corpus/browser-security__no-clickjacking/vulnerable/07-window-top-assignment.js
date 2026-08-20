/** VULNERABLE - `window.`-prefixed, and otherwise identical to fixture 04.
 *  The prefix is a spelling, not a protection. */
export function escapeFrame() {
  window.top.location = 'https://app.example/home';
}
