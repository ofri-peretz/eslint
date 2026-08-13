/**
 * Tests for no-homoglyph-identifiers
 * Security: CWE-1007 (Insufficient Visual Distinction of Homoglyphs)
 *
 * Every fixture in benchmarks/corpus/CWE-1007 is pinned here — the two
 * vulnerable files as `invalid`, the two safe files as `valid`.
 *
 * Deceptive characters are written as TypeScript escapes in *this* file, so the
 * test source stays readable while the code handed to the RuleTester contains
 * the real, invisible character. Anything else would make these tests
 * unreviewable for exactly the reason the rule exists.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHomoglyphIdentifiers } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

/** Cyrillic small letter a — renders identically to ASCII "a". */
const CYRILLIC_A = '\u0430';
/** Zero-width space. */
const ZWSP = '\u200b';
/** Zero-width joiner — legitimate inside emoji and Persian/Hindi text. */
const ZWJ = '\u200d';
/** Right-to-left override — the Trojan Source character. */
const RLO = '\u202e';
/** Zero-width non-joiner — mandatory in Persian compounds. */
const ZWNJ = '\u200c';

describe('no-homoglyph-identifiers', () => {
  ruleTester.run('no-homoglyph-identifiers', noHomoglyphIdentifiers, {
    valid: [
      // ---------------------------------------------------------------
      // Corpus fixtures that must stay silent
      // ---------------------------------------------------------------
      {
        // benchmarks/corpus/CWE-1007/safe/ascii-identifiers.js
        name: 'corpus safe: plain ASCII identifiers',
        code: `
          const ADMIN_ROLE = 'admin';
          const GUEST_ROLE = 'guest';

          function grantAccess(user) {
            return user.role === ADMIN_ROLE ? 'full-access' : 'read-only';
          }

          function describeUser(user) {
            return \`\${user.name} (\${grantAccess(user)})\`;
          }
        `,
      },
      {
        // benchmarks/corpus/CWE-1007/safe/i18n-ui-copy.js
        // The FP lock. Hebrew, Russian and Japanese are translation data, not
        // deception — every character here is one the reader can see.
        name: 'corpus safe: Hebrew/Russian/Japanese translation strings',
        code: `
          const MESSAGES = {
            en: { signIn: 'Sign in', adminBadge: 'Administrator' },
            he: { signIn: 'התחברות', adminBadge: 'מנהל מערכת' },
            ru: { signIn: 'Войти', adminBadge: 'Администратор' },
            ja: { signIn: 'ログイン', adminBadge: '管理者' },
          };

          function renderSignInButton(button, locale) {
            button.textContent = (MESSAGES[locale] || MESSAGES.en).signIn;
          }
        `,
      },

      // ---------------------------------------------------------------
      // Non-English identifiers are not an attack
      // ---------------------------------------------------------------
      {
        name: 'an identifier written entirely in Cyrillic',
        // Single-script: nothing here is disguised as ASCII, so there is
        // nothing to confuse it with.
        code: "const имя = 'x';",
      },
      {
        name: 'a mixed-script identifier whose non-ASCII part is not confusable',
        code: 'const userשם = 1;',
      },

      // ---------------------------------------------------------------
      // Visible non-ASCII text and legitimate joiners
      // ---------------------------------------------------------------
      {
        name: 'an emoji family sequence built with ZWJ',
        code: `const family = '\u{1f468}${ZWJ}\u{1f469}${ZWJ}\u{1f467}';`,
      },
      {
        name: 'a Persian compound joined with ZWNJ',
        code: `const label = 'می${ZWNJ}شود';`,
      },
      {
        name: 'a zero-width space written as an escape stays visible in review',
        code: "const ADMIN_GROUP = 'admin\\u200b';",
      },
      {
        name: 'a lone invisible character with no ASCII neighbour in a template',
        code: `const zwsp = \`${ZWSP}\`;`,
      },
      {
        name: 'a non-string literal is not scanned',
        code: 'const limit = 42;',
      },
      {
        name: 'a regular expression literal is not scanned',
        code: 'const pattern = /admin/;',
      },

      // ---------------------------------------------------------------
      // Options
      // ---------------------------------------------------------------
      {
        name: 'checkIdentifiers: false disables the identifier scan',
        code: `const ${CYRILLIC_A}dminRole = 'guest';`,
        options: [{ checkIdentifiers: false }],
      },
      {
        name: 'checkStrings: false disables the literal scan',
        code: `const ADMIN_GROUP = 'admin${ZWSP}';`,
        options: [{ checkStrings: false }],
      },
      {
        name: 'checkStrings: false also disables the template scan',
        code: `const banner = \`admin${ZWSP}\`;`,
        options: [{ checkStrings: false }],
      },
    ],

    invalid: [
      // ---------------------------------------------------------------
      // Corpus fixtures that must report
      // ---------------------------------------------------------------
      {
        // benchmarks/corpus/CWE-1007/vulnerable/cyrillic-homoglyph-identifier.js
        // Two reports: the declaration and the use. Each occurrence is
        // independently unreadable — a reviewer who fixes one and not the
        // other still ships two bindings that look like one.
        name: 'corpus vulnerable: Cyrillic homoglyph identifier',
        code: `
          const adminRole = 'admin';
          const ${CYRILLIC_A}dminRole = 'guest';

          function grantAccess(user) {
            return user.role === ${CYRILLIC_A}dminRole ? 'full-access' : 'read-only';
          }
        `,
        errors: [
          {
            messageId: 'homoglyphIdentifier',
            data: {
              name: `${CYRILLIC_A}dminRole`,
              codepoint: 'U+0430',
              latin: 'a',
            },
          },
          {
            messageId: 'homoglyphIdentifier',
            data: {
              name: `${CYRILLIC_A}dminRole`,
              codepoint: 'U+0430',
              latin: 'a',
            },
          },
        ],
      },
      {
        // benchmarks/corpus/CWE-1007/vulnerable/zero-width-in-auth-string.js
        name: 'corpus vulnerable: zero-width space inside an auth constant',
        code: `
          const ADMIN_GROUP = 'admin${ZWSP}';

          function isAdmin(user) {
            return user.group === ADMIN_GROUP;
          }
        `,
        errors: [
          {
            messageId: 'invisibleCharacter',
            data: { codepoint: 'U+200B', index: '6' },
          },
        ],
      },

      // ---------------------------------------------------------------
      // Identifier variations
      // ---------------------------------------------------------------
      {
        name: 'a private class field with a Cyrillic homoglyph',
        code: `class Session { #${CYRILLIC_A}dmin = true; }`,
        errors: [
          {
            messageId: 'homoglyphIdentifier',
            data: { name: `${CYRILLIC_A}dmin`, codepoint: 'U+0430', latin: 'a' },
          },
        ],
      },
      {
        name: 'a fullwidth uppercase letter',
        code: 'const ＡdminRole = 1;',
        errors: [
          {
            messageId: 'homoglyphIdentifier',
            data: { name: 'ＡdminRole', codepoint: 'U+FF21', latin: 'A' },
          },
        ],
      },
      {
        name: 'a fullwidth lowercase letter',
        code: 'const admiｎ = 1;',
        errors: [
          {
            messageId: 'homoglyphIdentifier',
            data: { name: 'admiｎ', codepoint: 'U+FF4E', latin: 'n' },
          },
        ],
      },
      {
        name: 'a Greek omicron in a property name',
        code: 'config.passwοrd = secret;',
        errors: [
          {
            messageId: 'homoglyphIdentifier',
            data: { name: 'passwοrd', codepoint: 'U+03BF', latin: 'o' },
          },
        ],
      },

      // ---------------------------------------------------------------
      // Invisible-character variations
      // ---------------------------------------------------------------
      {
        name: 'a bidi override inside a string (Trojan Source)',
        code: `const note = 'admin${RLO}// safe';`,
        errors: [
          {
            messageId: 'invisibleCharacter',
            data: { codepoint: 'U+202E', index: '6' },
          },
        ],
      },
      {
        name: 'an invisible character in a template chunk',
        code: `const greeting = \`hello${ZWSP}world\`;`,
        errors: [
          {
            messageId: 'invisibleCharacter',
            data: { codepoint: 'U+200B', index: '5' },
          },
        ],
      },
      {
        name: 'a template chunk that starts with an invisible character',
        code: `const greeting = \`${ZWSP}world\`;`,
        errors: [
          {
            messageId: 'invisibleCharacter',
            data: { codepoint: 'U+200B', index: '0' },
          },
        ],
      },
      {
        name: 'a template chunk that ends with an invisible character',
        code: `const greeting = \`world${ZWSP}\`;`,
        errors: [
          {
            messageId: 'invisibleCharacter',
            data: { codepoint: 'U+200B', index: '5' },
          },
        ],
      },
    ],
  });
});
