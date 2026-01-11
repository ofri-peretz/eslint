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

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
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
      description: 'Prevent runtime dependency injection with dynamic paths',
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
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Dynamic require
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type !== AST_NODE_TYPES.Literal
        ) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
      
      ImportExpression(node: TSESTree.ImportExpression) {
        // Dynamic import()
        if (node.source.type !== 'Literal') {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
   };
  },
});

