/**
 * @fileoverview Ensure secure default configurations
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/453.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireSecureDefaults = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-defaults',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure secure default configurations',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-1188',
        description: 'Ensure secure default configurations detected - Insecure default values',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1188.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Property(node: TSESTree.Property) {
        if (node.key.type === 'Identifier' && 
            ['secure', 'strictSSL', 'verify'].includes(node.key.name) &&
            node.value.type === 'Literal' && 
            node.value.value === false) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
