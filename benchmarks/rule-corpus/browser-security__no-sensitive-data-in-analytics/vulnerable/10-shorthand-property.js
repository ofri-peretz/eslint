/**
 * VULNERABLE - ADVERSARIAL. ES6 shorthand. The key is still `email`; there is
 * just no value expression to look at.
 */
const { email, plan } = user;
analytics.track('Signup Completed', { email, plan });
