/**
 * VULNERABLE - `sessionStorage` is the same trust boundary as `localStorage`;
 * it just expires sooner.
 */
if (sessionStorage.getItem('role')) {
  renderModeratorTools();
}
