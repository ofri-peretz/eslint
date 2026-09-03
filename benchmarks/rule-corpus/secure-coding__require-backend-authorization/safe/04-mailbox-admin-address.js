/**
 * SAFE - NOMINAL CONTROL. `admin` here is the name of a mailbox, not a
 * privilege. Nothing in this file authorises anything; it decides where a
 * bounce notification is sent.
 */
import { sendMail } from '../lib/mailer';

export function notifyBounce(mailbox, message) {
  if (mailbox.admin) {
    return sendMail(mailbox.admin, `Bounce: ${message.subject}`);
  }

  return sendMail(mailbox.fallback, `Bounce: ${message.subject}`);
}
