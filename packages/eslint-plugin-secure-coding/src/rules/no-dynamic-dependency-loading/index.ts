/**
 * @fileoverview Prevent dynamic dependency injection
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/494.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noDynamicDependencyLoading = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-dependency-loading',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent runtime dependency injection with dynamic paths',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M2'],
      cweIds: ['CWE-494'],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-1104',
        description: 'Dynamic import/require detected - use static imports for security',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1104.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Dynamic require
        if (node.callee.name === 'require' && node.arguments[0]?.type !== 'Literal') {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
      
      ImportExpression(node: TSESTree.ImportExpression) {
        // Dynamic import()
        if (node.source.type !== 'Literal') {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
   };
  },
});

