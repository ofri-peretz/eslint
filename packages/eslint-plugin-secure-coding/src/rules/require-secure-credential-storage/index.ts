/**
 * @fileoverview Enforce secure storage patterns for credentials
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/522.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireSecureCredentialStorage = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-credential-storage',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce secure storage patterns for credentials',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-312',
        description: 'Enforce secure storage patterns for credentials detected - Credentials without encryption',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/312.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          ['setItem', 'writeFile'].includes(node.callee.property.name)
        ) {
          // Check for encryption wrapper
          const hasEncryption = node.arguments.some(arg =>
            arg.type === AST_NODE_TYPES.CallExpression &&
            arg.callee.type === AST_NODE_TYPES.Identifier &&
            arg.callee.name.includes('encrypt')
          );
          if (!hasEncryption) {
            context.report({ node, messageId: 'violationDetected' });
          }
        }
      },
    };
  },
});
