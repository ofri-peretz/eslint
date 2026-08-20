/**
 * SAFE - The flag names occur only inside strings and comments: this is the
 * copy shown in the desktop team's onboarding checklist UI.
 *
 * Nothing here configures anything. A rule that reads text rather than the AST
 * reports the document that tells people to do the right thing.
 */
// Reviewers: reject any PR that sets nodeIntegration: true.
const HARDENING_CHECKLIST = [
  'nodeIntegration: true is forbidden in every window',
  'contextIsolation: false is forbidden in every window',
  'webSecurity: false is forbidden outside a local test harness',
  'sandbox: false requires a written exception',
];

module.exports = { HARDENING_CHECKLIST };
