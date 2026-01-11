/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require MIME type validation for uploads
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const requireMimeTypeValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-mime-type-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require MIME type validation for file uploads',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing MIME Validation',
        cwe: 'CWE-434',
        description: 'File upload without MIME type validation - unrestricted upload vulnerability',
        severity: 'HIGH',
        fix: 'Add fileFilter option to validate MIME types',
        documentationLink: 'https://cwe.mitre.org/data/definitions/434.html',
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
      CallExpression(node: TSESTree.CallExpression) {
        // Detect multer().single() or multer().array() without fileFilter
        if (node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            ['single', 'array', 'fields'].includes(node.callee.property.name)) {
          
          // Check if parent has fileFilter configuration
          const calleeObj = node.callee.object;
          if (calleeObj.type === AST_NODE_TYPES.CallExpression) {
            const multerArgs = calleeObj.arguments[0];
            if (multerArgs && multerArgs.type === AST_NODE_TYPES.ObjectExpression) {
              const hasFileFilter = multerArgs.properties.some(
                (p) => p.type === AST_NODE_TYPES.Property && p.key.type === AST_NODE_TYPES.Identifier && (p.key.name === 'fileFilter' || p.key.name === 'limits')
              );
              if (!hasFileFilter) {
                report(node);
              }
            } else if (!multerArgs) {
              // No config at all = no validation
              report(node);
            }
          }
        }
        
        // Detect upload() calls directly
        if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'upload') {
          // Check if there's validation in arguments
          if (node.arguments.length === 0 || 
              (node.arguments[0]?.type === AST_NODE_TYPES.Identifier)) {
            report(node);
          }
        }
      },
    };
  },
});
