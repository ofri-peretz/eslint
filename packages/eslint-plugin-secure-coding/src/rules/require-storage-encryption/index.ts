/**
 * @fileoverview Require encryption for persistent storage
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/311.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireStorageEncryption = createRule<RuleOptions, MessageIds>({
  name: 'require-storage-encryption',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require encryption for persistent storage',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-312',
        description: 'Require encryption for persistent storage detected - Storage without encryption',
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
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            ['setItem', 'writeFile'].includes(node.callee.property.name)) {
          // Check for encryption wrapper
          const hasEncryption = node.arguments.some(arg =>
            arg.type === 'CallExpression' &&
            arg.callee.type === 'Identifier' &&
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
