/**
 * VULNERABLE - Type juggling, the CWE-697 half of this rule. The stored one-time
 * code is a NUMBER and the submitted one is a STRING from the request body, so
 * `'0e0' == 0` and `'0' == 0` both pass and any account with a code beginning
 * `0` is takeable.
 */
import { otpStore } from '../store/otp';

export function confirmOtp(req, res) {
  const storedOtp = otpStore.get(req.body.accountId);
  if (req.body.otp == storedOtp) {
    return res.json({ verified: true });
  }
  return res.status(403).json({ error: 'invalid code' });
}
