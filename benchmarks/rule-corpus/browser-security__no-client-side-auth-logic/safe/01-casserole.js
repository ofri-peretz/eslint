/**
 * SAFE - The shipped false positive. `role` lives inside `casserole`, and this
 * rule ships at `error` in `recommended`, so the finding reached every
 * consumer of the preset at CRITICAL severity with no way to configure it away.
 */
if (localStorage.getItem('recipe-casserole-draft')) {
  restoreDraft();
}
