/**
 * @fileoverview Identify excessive data collection
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/213.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireDataMinimization = createRule<RuleOptions, MessageIds>({
  name: 'require-data-minimization',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Identify excessive data collection patterns',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M6'],
      cweIds: ['CWE-213'],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-213',
        description: 'Excessive data collection detected - only collect data that is necessary',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/213.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    return {
      ObjectExpression(node: TSESTree.ObjectExpression) {
        // Flag objects with >10 properties being collected
        if (node.properties.length > 10) {
          // Check if this looks like user data collection
          const hasUserData = node.properties.some(p => 
            p.type === 'Property' && 
            ['email', 'name', 'phone', 'address'].includes(p.key.name)
          );
          
          if (hasUserData) {
            report(node);
          }
        }
      },
    };
  },
});

