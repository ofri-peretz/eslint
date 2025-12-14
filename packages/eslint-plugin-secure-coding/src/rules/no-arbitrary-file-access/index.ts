/**
 * @fileoverview Prevent file access from user input
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noArbitraryFileAccess = createRule<RuleOptions, MessageIds>({
  name: 'no-arbitrary-file-access',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent file access from user input',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Arbitrary File Access',
        cwe: 'CWE-22',
        description: 'File path from user input - path traversal vulnerability',
        severity: 'HIGH',
        fix: 'Validate and sanitize file paths, use allowlists',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const fsReadMethods = ['readFile', 'readFileSync', 'readdir', 'readdirSync', 'stat', 'statSync'];
    const fsWriteMethods = ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync'];
    const userInputSources = ['req', 'request', 'params', 'query', 'body'];
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Detect fs.* with user input
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'fs' &&
            node.callee.property.type === 'Identifier' &&
            [...fsReadMethods, ...fsWriteMethods].includes(node.callee.property.name)) {
          
          const pathArg = node.arguments[0];
          
          // Flag if path is a variable (not a literal)
          if (pathArg && pathArg.type === 'Identifier') {
            report(node);
            return; // Already reported
          }
          
          // Flag if path is from a member expression (user input sources)
          if (pathArg?.type === 'MemberExpression' &&
              pathArg.object.type === 'Identifier') {
            const objName = pathArg.object.name.toLowerCase();
            if (userInputSources.includes(objName)) {
              report(node);
            }
          }
        }
      },
    };
  },
});
