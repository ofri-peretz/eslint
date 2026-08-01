// CWE-1007: Safe — plain ASCII identifiers, one canonical role constant
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — every identifier is ASCII and the comparison uses the single source of truth
const ADMIN_ROLE = 'admin';
const GUEST_ROLE = 'guest';

function grantAccess(user) {
  return user.role === ADMIN_ROLE ? 'full-access' : 'read-only';
}

function describe(user) {
  return `${user.name} (${grantAccess(user)})`;
}
