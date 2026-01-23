/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent sensitive data in temp directories
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  tempPaths?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_TEMP_PATHS = ['/tmp', '/var/tmp', 'temp/', '/temp'];

export const noDataInTempStorage = createRule<RuleOptions, MessageIds>({
  name: 'no-data-in-temp-storage',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent sensitive data in temp directories',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Temp Storage Data',
        cwe: 'CWE-312',
        description: 'Sensitive data written to temp directory - not secure',
        severity: 'HIGH',
        fix: 'Use secure storage location or encrypt data before writing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/312.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          tempPaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom list of temporary paths to flag'
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files or patterns to ignore'
          }
        },
        additionalProperties: false
      }
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const tempPaths = options.tempPaths || DEFAULT_TEMP_PATHS;
    const ignoreFiles = options.ignoreFiles || [];
    const filename = context.filename;

    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {};
    }

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect fs.writeFileSync or fs.writeFile with temp path
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'fs' &&
            node.callee.property.type === 'Identifier' &&
            ['writeFileSync', 'writeFile'].includes(node.callee.property.name)) {
          
          const pathArg = node.arguments[0];
          if (pathArg && pathArg.type === 'Literal' && typeof pathArg.value === 'string') {
            if (tempPaths.some(tp => pathArg.value.includes(tp))) {
              report(pathArg);
            }
          }
        }
      },
      
      Literal(node: TSESTree.Literal) {
        // Detect temp path literals
        if (typeof node.value === 'string') {
          if (tempPaths.some(tp => node.value.includes(tp))) {
            // Only flag if parent is assignment or variable declaration
            const parent = node.parent;
            if (parent?.type === 'VariableDeclarator' || parent?.type === 'AssignmentExpression') {
              // Avoid double reporting if it's already handled by CallExpression
              if (parent.type === 'VariableDeclarator' || parent.type === 'AssignmentExpression') {
                 // Check if it's the first argument of an fs call which is handled above
                 // Actually the Literal listener here catches it regardless of being in fs call or not if it's in a VariableDeclarator
              }
              report(node);
            }
          }
        }
      },
    };
  },
});
