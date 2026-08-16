/**
 * SAFE - twilio-node src/base/BaseTwilio.ts:165. `apiKeyMsg` holds a sentence
 * ABOUT an API key; `passwordError` is an error, not a password. A
 * credential-ish name is necessary but not sufficient.
 */
const apiKeyMsg = '. The given SID indicates an API Key, which requires an account SID.';

export function assertAccountSid(sid, passwordError) {
  if (!sid.startsWith('AC')) {
    throw new Error('accountSid must start with AC' + apiKeyMsg);
  }
  if (passwordError) {
    console.error(passwordError);
  }
  return sid;
}
