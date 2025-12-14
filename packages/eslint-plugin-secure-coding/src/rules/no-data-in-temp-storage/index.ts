/**
 * @fileoverview Prevent sensitive data in temp directories
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

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
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const tempPaths = ['/tmp', '/var/tmp', 'temp/', '/temp'];
    
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
              report(node);
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
              report(node);
            }
          }
        }
      },
    };
  },
});
