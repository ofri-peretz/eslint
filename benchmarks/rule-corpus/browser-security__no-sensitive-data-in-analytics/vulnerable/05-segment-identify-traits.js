/**
 * VULNERABLE - Segment's traits arrive NESTED, which is what the vendor's own
 * documentation shows. A one-level scan of the payload misses it.
 */
analytics.identify(user.id, {
  traits: {
    plan: user.plan,
    ssn: user.taxId,
  },
});
