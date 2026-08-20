/**
 * SAFE - A fixed hex string handed to a DIFFERENT crypto API. It is a bug in
 * its own right (a hardcoded HMAC key belongs to CWE-798), but it is not this
 * rule's finding, and claiming it would make the IV signal meaningless.
 */
import { createHmac } from 'node:crypto';

/** Express middleware: sign an outbound callback. */
export function signCallback(body) {
  return createHmac('sha256', '0123456789abcdef').update(body).digest('hex');
}
