/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent dynamic dependency injection
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/494.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isStaticExpression,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noDynamicDependencyLoading = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-dependency-loading',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-dependency-loading.md',
      description: 'Prevent runtime dependency injection with dynamic paths',
      cwe: 'CWE-1104',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-1104',
        description: 'Dynamic import/require detected - use static imports for security',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1104.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    /**
     * "Not a string literal" is not the same question as "can an attacker steer it".
     * `require(`b`)`, `require(`lodash/${d}`)` with `const d = 'debounce'`, and
     * `require(__dirname + '/utils')` are all fixed at build time and all three are
     * cases eslint-plugin-security's own corpus marks valid — we reported every one.
     * `isStaticExpression` resolves const bindings, template parts and concatenation
     * through ESLint's scope analysis, so the module specifier is judged by whether it
     * can change, not by its node type.
     */
    const isSteerable = (node: TSESTree.Node): boolean =>
      !isStaticExpression({ node, scope: context.sourceCode.getScope(node) });

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Dynamic require
        const specifier = node.arguments[0];
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          specifier !== undefined &&
          isSteerable(specifier)
        ) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        // Dynamic import()
        if (isSteerable(node.source)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
   };
  },
});

