/**
 * SAFE (adversarial) - an environment write whose KEY contains a credential
 * word but whose value is a documentation URL and a feature flag. Neither is a
 * secret. This is the false-positive shape that costs a rule its welcome in a
 * real config module.
 */
function configureHelpLinks() {
  process.env.PASSWORD_POLICY_URL = 'https://docs.example.com/security/password-policy';
  process.env.TOKEN_REFRESH_STRATEGY = 'sliding';
  process.env.SECRET_SCANNING_ENABLED = 'true';
}

module.exports = { configureHelpLinks };
