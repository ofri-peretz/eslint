/**
 * VULNERABLE - Google Analytics puts the payload in the THIRD argument.
 * Hardcoding argument index 1 is how this rule came to see only Segment.
 */
gtag('event', 'purchase', {
  value: order.total,
  user_email: order.customerEmail,
});
