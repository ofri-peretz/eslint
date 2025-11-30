/**
 * ESLint Rule: no-namespace
 * Prevent namespace imports
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noNamespace';

export const noNamespace = createRule<[], MessageIds>({
  name: 'no-namespace',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent namespace imports',
    },
    messages: {
      noNamespace: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Namespace Import',
        description: 'Namespace import detected',
        severity: 'LOW',
        fix: 'Use named imports instead: import { Component } from "react"',
        documentationLink: 'https://react.dev/learn/importing-and-exporting-components',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportNamespaceSpecifier(node: TSESTree.ImportNamespaceSpecifier) {
        context.report({
          node,
          messageId: 'noNamespace',
        });
      },
    };
  },
});
