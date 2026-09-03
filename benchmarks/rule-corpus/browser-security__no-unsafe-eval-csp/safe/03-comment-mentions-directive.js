/** SAFE - the directive name appears only in prose. A comment ships nothing.
 *
 *  We deliberately do NOT allow 'unsafe-eval' here: the bundler emits no
 *  Function constructors, so script-src can stay strict.
 */
export const csp = "default-src 'self'; script-src 'self'";
