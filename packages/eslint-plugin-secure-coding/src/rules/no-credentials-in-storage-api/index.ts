/**
 * @fileoverview Disallow storing credentials in browser/mobile storage APIs
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noCredentialsInStorageApi = createRule<RuleOptions, MessageIds>({
  name: 'no-credentials-in-storage-api',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow storing credentials in browser/mobile storage APIs',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Credentials in Storage',
        cwe: 'CWE-522',
        description: 'Credentials stored in insecure browser/mobile storage',
        severity: 'CRITICAL',
        fix: 'Use secure storage like Keychain, SecureStore, or encrypted storage',
        documentationLink: 'https://cwe.mitre.org/data/definitions/522.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const sensitiveKeys = ['password', 'token', 'apikey', 'secret', 'credential', 'auth', 'key'];
    const storageObjects = ['localStorage', 'sessionStorage', 'AsyncStorage'];
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check localStorage.setItem/sessionStorage.setItem/AsyncStorage.setItem
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            storageObjects.includes(node.callee.object.name) &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'setItem') {
          
          const keyArg = node.arguments[0];
          if (keyArg && keyArg.type === 'Literal' && typeof keyArg.value === 'string') {
            const key = keyArg.value.toLowerCase();
            if (sensitiveKeys.some(k => key.includes(k))) {
              report(node);
            }
          }
        }
      },
    };
  },
});
