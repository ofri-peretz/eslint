/**
 * @fileoverview Prevent configuration allowing insecure loads
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/749.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noAllowArbitraryLoads = createRule<RuleOptions, MessageIds>({
  name: 'no-allow-arbitrary-loads',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent configuration allowing insecure loads',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M5'],
      cweIds: ["CWE-749"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-295',
        description: 'Prevent configuration allowing insecure loads detected - allowArbitraryLoads: true',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/295.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Property(node: TSESTree.Property) {
        if (node.key.type === 'Identifier' && 
            node.key.name === 'allowArbitraryLoads' &&
            node.value.type === 'Literal' && 
            node.value.value === true) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
