/** VULNERABLE - the policy is assembled from a list and joined at the end.
 *  The shipped header is byte-identical to fixture 01; only the authoring
 *  style differs. */
const SCRIPT_SOURCES = ["'self'", 'https://cdn.example.com', "'unsafe-eval'"];

export const csp = `default-src 'self'; script-src ${SCRIPT_SOURCES.join(' ')}`;
