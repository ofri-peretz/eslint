/** VULNERABLE - Helmet takes the policy as a structured object, so the
 *  directive is one element of a scriptSrc array and never appears in a
 *  sentence with the word "script-src" next to it. */
const helmet = require('helmet');

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
    },
  }),
);
