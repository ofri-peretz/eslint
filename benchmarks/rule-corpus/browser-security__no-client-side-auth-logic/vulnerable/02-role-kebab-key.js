/**
 * VULNERABLE - The same decision with a kebab-case key. Segment matching has
 * to see `role` as a WORD here while not seeing it inside `casserole`.
 */
if (localStorage.getItem('user-role')) {
  mountAdminRoutes();
}
