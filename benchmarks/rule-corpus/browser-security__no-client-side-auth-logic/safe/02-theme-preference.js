/**
 * SAFE - A rendering preference. Nothing is authorized, and moving it to the
 * server would be meaningless.
 */
if (localStorage.getItem('color-theme')) {
  applyStoredTheme();
}
