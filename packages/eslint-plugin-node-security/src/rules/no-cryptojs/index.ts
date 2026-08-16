/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cryptojs
 * Warns on usage of deprecated crypto-js library
 * CWE-1104: Use of Unmaintained Third Party Components
 *
 * crypto-js is not maintained since 2022 and recommends using native crypto
 * @see https://www.npmjs.com/package/crypto-js
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'deprecatedCryptojs';

/**
 * No options.
 *
 * A `severity: 'error' | 'warn'` option used to sit here, defaulted in both the
 * schema and `defaultOptions` and documented in `docs/rules/no-cryptojs.md` as
 * "Severity level for reports". `create()` never read it, and no rule can:
 * ESLint takes severity from the config entry (`'…/no-cryptojs': 'error'`), not
 * from rule options. A consumer who set `severity: 'error'` got warn-level
 * reports and a schema that accepted the setting without complaint. Deleted, so
 * that config fails loudly instead of lying quietly.
 */
export type Options = Record<string, never>;

type RuleOptions = [Options?];

export const noCryptojs = createRule<RuleOptions, MessageIds>({
  name: 'no-cryptojs',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-cryptojs.md',
      description: 'Disallow deprecated crypto-js library (use native crypto instead)',
      cwe: 'CWE-1104',
      cvss: 5.3,
    },
    messages: {
      deprecatedCryptojs: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated crypto-js library',
        cwe: 'CWE-1104',
        description: 'crypto-js is no longer maintained (last update: 2022). Future vulnerabilities will not be patched.',
        severity: 'MEDIUM',
        fix: 'Migrate to native Node.js crypto module or Web Crypto API',
        documentationLink: 'https://nodejs.org/api/crypto.html',
      }),

    },
    schema: [],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function reportDeprecatedLibrary(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'deprecatedCryptojs',
      });
    }

    return {
      // import CryptoJS from 'crypto-js'
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (
          typeof node.source.value === 'string' &&
          (node.source.value === 'crypto-js' || node.source.value.startsWith('crypto-js/'))
        ) {
          reportDeprecatedLibrary(node);
        }
      },

      // const CryptoJS = require('crypto-js')
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal &&
          typeof node.arguments[0].value === 'string' &&
          (node.arguments[0].value === 'crypto-js' || node.arguments[0].value.startsWith('crypto-js/'))
        ) {
          reportDeprecatedLibrary(node);
        }
      },
    };
  },
});

export type { Options as NoCryptojsOptions };
