/**
 * SAFE - The sink appears only inside a string literal, in our own docs copy.
 */
export const LINT_HELP =
  "localStorage.setItem('access_token', jwt) puts a bearer credential where any XSS can read it.";
