/**
 * @fileoverview Detect debug code in production
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/489.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noDebugCodeInProduction = createRule<RuleOptions, MessageIds>({
  name: 'no-debug-code-in-production',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect debug code in production',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-489',
        description: 'Detect debug code in production detected - DEBUG, __DEV__, console',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/489.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Identifier(node: TSESTree.Identifier) {
        if (['DEBUG', '__DEV__'].includes(node.name)) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'log'
        ) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
