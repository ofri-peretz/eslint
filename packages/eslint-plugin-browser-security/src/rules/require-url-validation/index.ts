/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Enforce URL validation before navigation
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireUrlValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-url-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce URL validation before navigation',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'URL Validation Required',
        cwe: 'CWE-601',
        description: 'Unvalidated URL used for navigation - this is a security risk',
        severity: 'HIGH',
        fix: 'Validate URLs before using them for navigation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/601.html',
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
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Detect window.location assignment from user input
        if (node.left.type === 'MemberExpression' &&
            node.left.object.type === 'Identifier' &&
            node.left.object.name === 'window' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'location') {
          
          // Flag if right side is a variable (not a literal URL)
          if (node.right.type === 'Identifier') {
            report(node);
          }
        }
        
        // Detect location.href assignment
        if (node.left.type === 'MemberExpression' &&
            node.left.object.type === 'Identifier' &&
            node.left.object.name === 'location' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'href') {
          
          if (node.right.type === 'Identifier') {
            report(node);
          }
        }
      },
      
      CallExpression(node: TSESTree.CallExpression) {
        // Detect window.open with variable URL
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'window' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'open') {
          
          const urlArg = node.arguments[0];
          if (urlArg && urlArg.type === 'Identifier') {
            report(node);
          }
        }
      },
    };
  },
});
