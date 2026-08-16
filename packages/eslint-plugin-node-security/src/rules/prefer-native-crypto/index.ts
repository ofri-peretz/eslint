/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-native-crypto
 * Suggests using native crypto over third-party libraries
 * CWE-1104: Use of Unmaintained Third Party Components
 *
 * Native crypto is maintained by Node.js/browser vendors and is always up-to-date
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'preferNative'
  | 'preferNativePasswordHash';

/**
 * No options.
 *
 * A `severity: 'error' | 'warn'` option used to sit here, defaulted to `'warn'`
 * in both the schema and `defaultOptions`, and documented in
 * `docs/rules/prefer-native-crypto.md` as "Severity level for reports". Nothing
 * in `create()` ever read it, and nothing could: an ESLint rule does not choose
 * its own severity — the config entry does (`'…/prefer-native-crypto': 'error'`).
 * A consumer who wrote `severity: 'error'` got warn-level reports and a schema
 * that accepted the setting without complaint. Deleted, so that config now
 * fails loudly instead of lying quietly.
 */
export type Options = Record<string, never>;

type RuleOptions = [Options?];

// Third-party crypto libraries whose job native crypto genuinely does.
const THIRD_PARTY_CRYPTO_LIBS = new Set([
  'crypto-js',
  'cryptojs',
  'sjcl',           // Stanford JavaScript Crypto Library
  'forge',          // node-forge
  'node-forge',
  'jsencrypt',
  'js-sha256',
  'js-sha512',
  'js-sha3',
  'js-md5',
  'blueimp-md5',
  'aes-js',
]);

/**
 * Password-hashing libraries, which need their own advice.
 *
 * `bcryptjs` used to sit in the list above with the comment "pure JS bcrypt
 * (prefer native bcrypt)", so the rule told anyone importing it to "migrate to
 * native crypto". That advice is wrong and acting on it is a downgrade:
 * `node:crypto` has no bcrypt, and the nearest thing it exposes is
 * `crypto.pbkdf2` / `crypto.scrypt` — different KDFs with different parameters,
 * not a drop-in. A developer who followed the message to `createHash('sha256')`
 * would replace a deliberately-slow password hash with a fast one, which is
 * CWE-916, a worse bug than the one being reported.
 *
 * The real remedy for `bcryptjs` is the native binding `bcrypt`, or `argon2`.
 * Both are third-party by necessity, so the message says so instead of
 * pretending the platform covers it.
 */
const PURE_JS_PASSWORD_HASH_LIBS = new Set([
  'bcryptjs',
  'bcrypt-nodejs',
]);

export const preferNativeCrypto = createRule<RuleOptions, MessageIds>({
  name: 'prefer-native-crypto',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/prefer-native-crypto.md',
      description: 'Prefer native crypto over third-party libraries',
      cwe: 'CWE-1104',
      cvss: 5.3,
    },
    messages: {
      preferNative: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Third-party crypto library',
        cwe: 'CWE-1104',
        description: '{{library}} is a third-party crypto library. Native crypto (Node.js crypto or Web Crypto API) is faster, more secure, and always maintained.',
        severity: 'MEDIUM',
        fix: 'Migrate to native crypto module',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),
      preferNativePasswordHash: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Pure-JS password hashing library',
        cwe: 'CWE-1104',
        description: '{{library}} is a pure-JavaScript password hash. It is orders of magnitude slower than a native implementation, so the same cost factor buys far less protection, and its maintenance has repeatedly lagged the native bindings.',
        severity: 'MEDIUM',
        fix: 'Use the native `bcrypt` binding, or `argon2` (Argon2id) for new code. Do NOT reach for node:crypto\'s createHash here — it has no bcrypt, and a general-purpose digest is not a password hash (CWE-916). crypto.scrypt is the only node:crypto function in this category.',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Judge a module specifier, reporting at `node`.
     *
     * The base package name only, so `crypto-js/aes` and `crypto-js` are the
     * same dependency. Exact set membership — never a substring test — so a
     * local module called `./forge-adapter` is untouched.
     */
    function checkSpecifier(node: TSESTree.Node, specifier: string) {
      const lib = specifier.split('/')[0];
      if (PURE_JS_PASSWORD_HASH_LIBS.has(lib)) {
        context.report({
          node,
          messageId: 'preferNativePasswordHash',
          data: { library: lib },
        });
        return;
      }
      if (THIRD_PARTY_CRYPTO_LIBS.has(lib)) {
        context.report({
          node,
          messageId: 'preferNative',
          data: { library: lib },
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (typeof node.source.value === 'string') {
          checkSpecifier(node, node.source.value);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal &&
          typeof node.arguments[0].value === 'string'
        ) {
          checkSpecifier(node, node.arguments[0].value);
        }
      },
    };
  },
});

export type { Options as PreferNativeCryptoOptions };
