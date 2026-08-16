/**
 * VULNERABLE - PostHog. A different vendor, the same privacy defect.
 */
posthog.capture('checkout_started', {
  cartValue: cart.total,
  creditCard: card.number,
});
