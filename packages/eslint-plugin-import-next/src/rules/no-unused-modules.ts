/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unused-modules
 * Forbid modules without exports
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-unused-modules.md',
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
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unused-modules.md',
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
  defaultOptions: [
    {
      allowImportOnly: false,
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowImportOnly = false } = options || {};

    let hasExports = false;
    let hasImports = false;

    return {
      ImportDeclaration() {
        hasImports = true;
      },
      ExportNamedDeclaration() {
        hasExports = true;
      },
      ExportDefaultDeclaration() {
        hasExports = true;
      },
      ExportAllDeclaration() {
        hasExports = true;
      },
      // TypeScript `export = x` compiles to `module.exports = x`
      TSExportAssignment() {
        hasExports = true;
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for CommonJS exports
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'Identifier' &&
          node.left.object.name === 'module' &&
          propertyName(node.left) === 'exports'
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
        // `allowImportOnly` exempts a module that imports but exports nothing. It is
        // not a rule-level off switch: a module with no imports at all does not "only
        // contain imports", so it is still reported.
        const importOnly = allowImportOnly && hasImports;
        if (!hasExports && !importOnly) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missingExports',
          });
        }
      },
    };
  },
});
