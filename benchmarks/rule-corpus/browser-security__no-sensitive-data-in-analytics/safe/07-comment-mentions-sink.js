/**
 * SAFE - The sink and the field appear only in a comment.
 */
// Never send analytics.track('x', { email }) — hash the identifier first.
analytics.track('Signup Completed', { userHash: sha256(user.email) });
