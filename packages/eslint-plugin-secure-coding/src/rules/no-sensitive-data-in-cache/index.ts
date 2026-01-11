/**
 * @fileoverview Prevent caching sensitive data without encryption
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/524.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noSensitiveDataInCache = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-in-cache',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent caching sensitive data without encryption',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-200',
        description: 'Prevent caching sensitive data without encryption detected - Sensitive data in cache',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/200.html',
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
            ['set', 'put', 'store'].includes(node.callee.property.name)) {
          const keyArg = node.arguments[0];
          if (keyArg && keyArg.type === 'Literal') {
            const key = keyArg.value.toString().toLowerCase();
            if (['password', 'token', 'credit', 'ssn'].some(k => key.includes(k))) {
              context.report({ node, messageId: 'violationDetected' });
            }
          }
        }
      },
    };
  },
});
