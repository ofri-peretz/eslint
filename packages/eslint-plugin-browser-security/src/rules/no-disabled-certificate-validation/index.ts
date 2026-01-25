/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent disabled SSL/TLS certificate validation
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noDisabledCertificateValidation = createRule<RuleOptions, MessageIds>({
  name: 'no-disabled-certificate-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent disabled SSL/TLS certificate validation',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Disabled Certificate Validation',
        cwe: 'CWE-295',
        description: 'SSL/TLS certificate validation is disabled - man-in-the-middle attack possible',
        severity: 'CRITICAL',
        fix: 'Remove rejectUnauthorized: false or verify: false, fix certificate issues properly',
        documentationLink: 'https://cwe.mitre.org/data/definitions/295.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const dangerousProperties = ['rejectUnauthorized', 'strictSSL', 'verify'];
    
    return {
      Property(node: TSESTree.Property) {
        // Check for dangerous SSL options set to false
        if (node.key.type === 'Identifier' && 
            dangerousProperties.includes(node.key.name) &&
            node.value.type === 'Literal' && 
            node.value.value === false) {
          report(node);
        }
      },
      
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for NODE_TLS_REJECT_UNAUTHORIZED = '0'
        if (node.left.type === 'MemberExpression' &&
            node.left.object.type === 'MemberExpression' &&
            node.left.object.object.type === 'Identifier' &&
            node.left.object.object.name === 'process' &&
            node.left.object.property.type === 'Identifier' &&
            node.left.object.property.name === 'env' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'NODE_TLS_REJECT_UNAUTHORIZED') {
          
          if (node.right.type === 'Literal' && node.right.value === '0') {
            report(node);
          }
        }
      },
    };
  },
});
