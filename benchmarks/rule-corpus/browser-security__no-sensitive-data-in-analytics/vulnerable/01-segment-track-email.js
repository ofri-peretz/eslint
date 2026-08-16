/**
 * VULNERABLE - The address goes to Segment, and from there to every downstream
 * destination the workspace has enabled.
 */
analytics.track('Signup Completed', {
  plan: 'pro',
  email: user.email,
});
