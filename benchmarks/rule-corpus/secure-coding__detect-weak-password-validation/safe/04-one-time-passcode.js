/**
 * SAFE — a six-digit one-time passcode, which is the CORRECT length.
 *
 * RFC 4226 and every TOTP authenticator ship six digits; the security of an OTP
 * comes from its 30-second lifetime and its rate limit, not from its length.
 * "Require at least 12 characters with complexity requirements" is actively
 * wrong advice here.
 *
 * `passcode` contains `pass` as a substring but is not the word `password` — the
 * distinction a whole-word test makes and a substring test cannot.
 */
import { otpStore } from '../lib/otp-store.js';

export async function verifyOtp(userId, passcode) {
  if (passcode.length === 6) {
    return otpStore.consume(userId, passcode);
  }

  return { verified: false, reason: 'Enter the 6-digit code' };
}
