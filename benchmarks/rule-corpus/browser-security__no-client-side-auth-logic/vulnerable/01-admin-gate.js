/**
 * VULNERABLE - The textbook shape. The browser's storage is the user's
 * storage; setting this key is one line in the console.
 */
if (localStorage.getItem('isAdmin')) {
  showBillingExport();
}
