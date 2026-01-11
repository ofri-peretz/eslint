/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Identify weak password requirements
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const detectWeakPasswordValidation = createRule<RuleOptions, MessageIds>({
  name: 'detect-weak-password-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Identify weak password requirements',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak Password Validation',
        cwe: 'CWE-521',
        description: 'Password length requirement is too weak (less than 8 characters)',
        severity: 'CRITICAL',
        fix: 'Require at least 12 characters with complexity requirements',
        documentationLink: 'https://cwe.mitre.org/data/definitions/521.html',
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
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Detect weak length requirements like password.length >= 4
        if (['>=', '>', '==', '==='].includes(node.operator)) {
          // Check if left side is .length
          if (node.left.type === 'MemberExpression' &&
              node.left.property.type === 'Identifier' &&
              node.left.property.name === 'length') {
            
            // Check if comparing to a weak number
            if (node.right.type === 'Literal' && 
                typeof node.right.value === 'number' &&
                node.right.value < 8) {
              
              // Check if variable name suggests password
              if (node.left.object.type === 'Identifier') {
                const varName = node.left.object.name.toLowerCase();
                if (varName.includes('password') || varName.includes('pwd') || varName.includes('pass')) {
                  report(node);
                }
              }
            }
          }
        }
      },
    };
  },
});
