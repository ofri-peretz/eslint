/** VULNERABLE - environment-indexed policies. The production entry is the one
 *  that ships, and it is reached by index, not by name. */
const POLICIES = [
  "default-src 'self'; script-src 'self'",
  "default-src 'self'; script-src 'self' 'unsafe-eval'",
];

export const activePolicy = POLICIES[1];
