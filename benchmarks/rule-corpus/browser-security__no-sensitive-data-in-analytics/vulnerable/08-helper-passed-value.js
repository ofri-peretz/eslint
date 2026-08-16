/**
 * VULNERABLE - The value arrives through a helper. The KEY is what tells the
 * vendor what this field is, and the key is unchanged.
 */
function currentEmail() {
  return session.user.email;
}

analytics.page('Pricing', { email: currentEmail() });
