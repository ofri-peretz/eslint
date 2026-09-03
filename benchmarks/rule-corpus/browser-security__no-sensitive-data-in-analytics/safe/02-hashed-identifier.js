/**
 * SAFE - The CORRECT remediation: hash the identifier before it leaves. The
 * vendor can join sessions and cannot read an address.
 */
analytics.track('Signup Completed', {
  userHash: sha256(user.email),
  plan: 'pro',
});
