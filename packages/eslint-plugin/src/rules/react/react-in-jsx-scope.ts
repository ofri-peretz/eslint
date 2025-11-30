/**
 * ESLint Rule: react-in-jsx-scope
 * Ensure React is in scope
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'reactInJsxScope';

export const reactInJsxScope = createRule<[], MessageIds>({
  name: 'react-in-jsx-scope',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure React is in scope',
    },
    messages: {
      reactInJsxScope: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'React Not in Scope',
        description: 'React must be in scope when using JSX',
        severity: 'CRITICAL',
        fix: 'Add import React from "react" at the top of the file',
        documentationLink: 'https://react.dev/learn/add-react-to-a-website#optional-using-jsx-without-a-build-step',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    let hasReactImport = false;
    let hasJsxUsage = false;

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Check for React import
        if (node.source.value === 'react') {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === 'ImportDefaultSpecifier' &&
              specifier.local.name === 'React'
            ) {
              hasReactImport = true;
              break;
            }
            if (
              specifier.type === 'ImportNamespaceSpecifier' &&
              specifier.local.name === 'React'
            ) {
              hasReactImport = true;
              break;
            }
          }
        }
      },

      // Check for JSX usage
      JSXElement() {
        hasJsxUsage = true;
      },

      JSXFragment() {
        hasJsxUsage = true;
      },

      // Check at the end of the program
      'Program:exit'(node: TSESTree.Program) {
        if (hasJsxUsage && !hasReactImport) {
          // Find the first JSX element to report on
          for (const statement of node.body) {
            if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
              context.report({
                node: statement.expression.openingElement.name,
                messageId: 'reactInJsxScope',
              });
              break;
            }
            if (statement.type === 'VariableDeclaration') {
              for (const declarator of statement.declarations) {
                if (declarator.init && declarator.init.type === 'JSXElement') {
                  context.report({
                    node: declarator.init.openingElement.name,
                    messageId: 'reactInJsxScope',
                  });
                  return;
                }
              }
            }
            if (statement.type === 'ReturnStatement' && statement.argument && statement.argument.type === 'JSXElement') {
              context.report({
                node: statement.argument.openingElement.name,
                messageId: 'reactInJsxScope',
              });
              break;
            }
          }
        }
      },
    };
  },
});
