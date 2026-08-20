/**
 * SAFE (adversarial) - A CLI printing guidance to a human. Every line contains
 * a credential word, a separator, and then a SENTENCE. None contains a value.
 */
export function printResetInstructions(email) {
  console.log('Reset your password: follow the link we just emailed you');
  console.log(`secret_key: rotate this from the dashboard, not from the CLI`);
  console.log('api_key: see the Settings page for your organisation');
  console.log('Sent to', email);
}
