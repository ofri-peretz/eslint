// secure-coding/no-homoglyph-identifiers — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/no-homoglyph-identifiers
const MESSAGES = {
            en: { signIn: 'Sign in', adminBadge: 'Administrator' },
            he: { signIn: 'התחברות', adminBadge: 'מנהל מערכת' },
            ru: { signIn: 'Войти', adminBadge: 'Администратор' },
            ja: { signIn: 'ログイン', adminBadge: '管理者' },
          };

          function renderSignInButton(button, locale) {
            button.textContent = (MESSAGES[locale] || MESSAGES.en).signIn;
          }
