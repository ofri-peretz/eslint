// CWE-1007: Safe — legitimate non-ASCII text in translated UI copy
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — non-Latin script here is user-facing translation data, not an identifier or a security comparison
const MESSAGES = {
  en: { signIn: 'Sign in', adminBadge: 'Administrator' },
  he: { signIn: 'התחברות', adminBadge: 'מנהל מערכת' },
  ru: { signIn: 'Войти', adminBadge: 'Администратор' },
  ja: { signIn: 'ログイン', adminBadge: '管理者' },
};

function renderSignInButton(button, locale) {
  button.textContent = (MESSAGES[locale] || MESSAGES.en).signIn;
}
