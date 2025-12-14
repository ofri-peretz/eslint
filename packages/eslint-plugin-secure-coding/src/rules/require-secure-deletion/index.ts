/**
 * @fileoverview Require secure data deletion patterns
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/459.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireSecureDeletion = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-deletion',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require secure data deletion patterns',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M9'],
      cweIds: ["CWE-459"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-459',
        description: 'Require secure data deletion patterns detected - delete without secure wipe',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/459.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      
      UnaryExpression(node: TSESTree.UnaryExpression) {
        if (node.operator === 'delete') {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
