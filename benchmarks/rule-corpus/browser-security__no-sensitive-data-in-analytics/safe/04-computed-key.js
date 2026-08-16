/**
 * SAFE - A computed key. Its value is not knowable from the AST, and guessing
 * would be exactly the mistake this rule was fixed for.
 */
analytics.track('Profile Updated', { [fieldName]: value });
