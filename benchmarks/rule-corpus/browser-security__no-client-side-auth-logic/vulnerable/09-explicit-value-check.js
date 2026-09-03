/**
 * VULNERABLE - The idiomatic spelling, because `getItem` returns a string.
 * A rule that only matches a bare `getItem` call as the test misses it.
 */
if (localStorage.getItem('isAdmin') === 'true') {
  showBillingExport();
}
