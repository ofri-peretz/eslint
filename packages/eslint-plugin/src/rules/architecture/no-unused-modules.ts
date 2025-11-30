/**
 * ESLint Rule: no-unused-modules
 * Forbid modules without exports
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingExports';

export interface Options {
  /** Allow modules that only contain imports */
  allowImportOnly?: boolean;
}

type RuleOptions = [Options?];

export const noUnusedModules = createRule<RuleOptions, MessageIds>({
  name: 'no-unused-modules',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid modules without exports',
    },
    hasSuggestions: false,
    messages: {
      missingExports: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Exports',
        description: 'Module has no exports',
        severity: 'LOW',
        fix: 'Add exports or remove if module is unused',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unused-modules.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowImportOnly: {
            type: 'boolean',
            default: false,
            description: 'Allow modules that only contain imports.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowImportOnly: false,
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowImportOnly = false } = options || {};

    let hasExports = false;

    return {
      ExportNamedDeclaration() {
        hasExports = true;
      },
      ExportDefaultDeclaration() {
        hasExports = true;
      },
      ExportAllDeclaration() {
        hasExports = true;
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for CommonJS exports
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'Identifier' &&
          node.left.object.name === 'module' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'exports'
        ) {
          hasExports = true;
        }
        // Check for exports.xxx = ...
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'Identifier' &&
          node.left.object.name === 'exports'
        ) {
          hasExports = true;
        }
      },
      'Program:exit'() {
        if (!hasExports && !allowImportOnly) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missingExports',
          });
        }
      },
    };
  },
});
