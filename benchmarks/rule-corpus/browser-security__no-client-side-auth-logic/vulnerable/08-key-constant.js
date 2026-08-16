/**
 * VULNERABLE - The storage key held in a constant, which is what every
 * codebase with more than one key does.
 */
const ROLE_KEY = 'user_role';

if (localStorage.getItem(ROLE_KEY)) {
  showAuditLog();
}
