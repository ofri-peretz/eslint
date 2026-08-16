/** SAFE - a Report-Only rollout of a STRICT policy. The header name differs,
 *  the policy is clean, and there is nothing to report. */
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self'; report-to csp-endpoint",
  );
  next();
});
