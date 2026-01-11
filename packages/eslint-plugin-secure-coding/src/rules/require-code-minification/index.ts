/**
 * @fileoverview Require minification configuration
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/656.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireCodeMinification = createRule<RuleOptions, MessageIds>({
  name: 'require-code-minification',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require minification configuration',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-656',
        description: 'Require minification configuration detected - Build config without minification',
        severity: 'LOW',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/656.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Property(node: TSESTree.Property) {
        if (node.key.type === 'Identifier' && 
            node.key.name === 'minimize' &&
            node.value.type === 'Literal' && 
            node.value.value === false) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
