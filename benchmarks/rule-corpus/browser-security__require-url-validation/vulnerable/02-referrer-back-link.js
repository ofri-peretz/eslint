/**
 * VULNERABLE - `document.referrer` is chosen by whoever linked to this page.
 */
document.getElementById('back').addEventListener('click', () => {
  window.open(document.referrer);
});
