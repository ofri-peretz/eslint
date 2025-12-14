/**
 * @fileoverview Detect HTTP resources in HTTPS pages
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/311.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const detectMixedContent = createRule<RuleOptions, MessageIds>({
  name: 'detect-mixed-content',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect HTTP resources in HTTPS pages',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M5'],
      cweIds: ["CWE-311"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-311',
        description: 'Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/311.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && node.value.startsWith('http://')) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
