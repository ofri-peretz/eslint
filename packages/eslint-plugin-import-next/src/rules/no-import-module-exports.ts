/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-import-module-exports
 * Forbid import statements with CommonJS module.exports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-import-module-exports.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { isLocallyBound } from '../utils/bindings';
import { matchesAnyFilePattern } from '../utils/file-patterns';

type MessageIds = 'importModuleExports';

export interface Options {
  /** File globs (or path substrings) where mixing is accepted */
  exceptions?: string[];
}

type RuleOptions = [Options?];

export const noImportModuleExports = createRule<RuleOptions, MessageIds>({
  name: 'no-import-module-exports',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-import-module-exports.md',
      description: 'Forbid import statements with CommonJS module.exports',
      cwe: 'CWE-1078',
      cvss: 7.5,
    },
    messages: {
      importModuleExports: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Mixed Module Syntax',
        cwe: 'CWE-1078',
        description:
          'Cannot use import statement with module.exports in the same file',
        severity: 'HIGH',
        fix: 'Use ES6 export syntax: export default or export { }',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-import-module-exports.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          exceptions: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ exceptions: [] }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let hasImport: boolean;
    let exceptions: string[];
    let moduleExportsNodes: TSESTree.Node[];

    return {
      before() {
        hasImport = false;
        moduleExportsNodes = [];
        exceptions = context.options[0]?.exceptions ?? [];
        // `exceptions` lists file globs where mixing is accepted.
        return !matchesAnyFilePattern(context.filename, exceptions);
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // `import type` is erased at compile time: it loads nothing, so it
        // mixes nothing with CommonJS.
        if (node.importKind !== 'type') hasImport = true;
      },
      MemberExpression(node: TSESTree.MemberExpression) {
        // `module.exports`, read or written. `module` must be the CommonJS
        // global, not a wrapper's parameter.
        if (
          node.object.type === AST_NODE_TYPES.Identifier &&
          node.object.name === 'module' &&
          propertyName(node) === 'exports' &&
          !isLocallyBound(context.sourceCode, node, 'module')
        ) {
          moduleExportsNodes.push(node);
        }
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // `exports.xxx = ...` on the CommonJS global.
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.type === AST_NODE_TYPES.Identifier &&
          node.left.object.name === 'exports' &&
          !isLocallyBound(context.sourceCode, node, 'exports')
        ) {
          moduleExportsNodes.push(node.left);
        }
      },
      'Program:exit'() {
        // If we have both imports and module.exports, report on module.exports
        if (hasImport && moduleExportsNodes.length > 0) {
          moduleExportsNodes.forEach((node) => {
            context.report({
              node,
              messageId: 'importModuleExports',
            });
          });
        }
      },
    };
  },
});
