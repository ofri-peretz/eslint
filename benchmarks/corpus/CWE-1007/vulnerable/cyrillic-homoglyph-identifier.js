// CWE-1007: Homoglyph — two identifiers that render identically
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — the second declaration uses Cyrillic 'а' (U+0430); the auth check reads the impostor
const adminRole = 'admin';
const аdminRole = 'guest';

function grantAccess(user) {
  return user.role === аdminRole ? 'full-access' : 'read-only';
}

function describe(user) {
  return `${user.name} (${grantAccess(user)})`;
}
