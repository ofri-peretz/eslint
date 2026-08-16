/** SAFE - the vocabulary appears only in documentation and a UI string.
 *  Nothing here registers a route.
 *
 *  Every mutating route is behind csurf; see server/middleware/csrf.js.
 */
export const ERRORS = {
  csrfExpired: 'Your session expired. Reload the page and try again.',
};
