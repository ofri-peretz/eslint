/**
 * SAFE (adversarial) - the word `password` appears in a storage KEY, a
 * documentation URL and a comment, and no credential exists anywhere in the
 * file. A password-strength meter's configuration is not a password. A report
 * here proves the rule reads text rather than tracking a secret.
 */
const passwordPolicyUrl = 'https://docs.example.com/security/password-policy';

export function cachePasswordMeterConfig(config) {
  // config.minLength, config.requireSymbol — display rules only
  localStorage.setItem('password-strength-meter', JSON.stringify(config));
  localStorage.setItem('password-policy-url', passwordPolicyUrl);
}
