/**
 * VULNERABLE - Webhook signature verification with `===`. This is the exact bug
 * Stripe's and GitHub's docs warn about; both ship `timingSafeEqual` examples
 * because of it.
 */
import crypto from 'node:crypto';

export function verifyWebhook(rawBody, headerSignature) {
  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return signature === headerSignature;
}
