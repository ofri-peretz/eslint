/**
 * VULNERABLE (adversarial) - A ternary selects which environment's credential is
 * compared. The secret-bearing constants are one binding away from the
 * comparison, and the enclosing function is named for the integration rather
 * than for security.
 */
const PRODUCTION_CREDENTIAL = process.env.PROD_CALLBACK_CREDENTIAL;
const SANDBOX_CREDENTIAL = process.env.SANDBOX_CALLBACK_CREDENTIAL;

export function handlePaymentCallback(req, res, next) {
  const reference = req.app.get('env') === 'production' ? PRODUCTION_CREDENTIAL : SANDBOX_CREDENTIAL;
  const presented = req.get('x-callback-credential');
  if (presented !== reference) {
    return res.status(401).end();
  }
  return next();
}
