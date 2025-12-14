/**
 * @fileoverview Prevent exposing stack traces to users
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/209.html
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noVerboseErrorMessages = createRule<RuleOptions, MessageIds>({
  name: 'no-verbose-error-messages',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent exposing stack traces to users',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M8'],
      cweIds: ["CWE-209"],
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-209',
        description: 'Prevent exposing stack traces to users detected - this is a security risk',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/209.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        
      // Check res.send/res.json with error.stack
      if (node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          ['send', 'json'].includes(node.callee.property.name)) {
        
        const arg = node.arguments[0];
        
        // Check for error.stack or err.stack
        if (arg?.type === 'MemberExpression' &&
            arg.property.name === 'stack') {
          report(node);
        }
        
        // Check for { stack: error.stack } in object
        if (arg?.type === 'ObjectExpression') {
          const stackProp = arg.properties.find(
            p => p.key?.name === 'stack' || 
                 (p.value?.type === 'MemberExpression' && p.value.property.name === 'stack')
          );
          if (stackProp) {
            report(node);
          }
        }
      }
    
      },
};
  },
});
