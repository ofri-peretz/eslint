/** SAFE for THIS rule - 'unsafe-inline' is a different directive value with a
 *  different CWE, owned by no-unsafe-inline-csp. Reporting it here would be
 *  one defect counted twice. */
export const csp =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'";
