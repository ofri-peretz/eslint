/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-absolute-path
 * Forbid import of modules using absolute paths
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-absolute-path.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import * as path from 'node:path';

type MessageIds = 'absolutePath';

export interface Options {
  /** Check ES module imports. Default: true */
  esmodule?: boolean;
  /** Check CommonJS require calls. Default: true */
  commonjs?: boolean;
  /** Check AMD define/require calls. Default: false */
  amd?: boolean;
}

type RuleOptions = [Options?];

export const noAbsolutePath = createRule<RuleOptions, MessageIds>({
  name: 'no-absolute-path',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid import of modules using absolute paths',
    },
    fixable: 'code',
    messages: {
      absolutePath: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Absolute Path Import',
        cwe: 'CWE-426',
        description: 'Import uses absolute path: {{importPath}}',
        severity: 'MEDIUM',
        fix: 'Use relative path instead: {{relativePath}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-absolute-path.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          esmodule: { type: 'boolean', default: true },
          commonjs: { type: 'boolean', default: true },
          amd: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ esmodule: true, commonjs: true, amd: false }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { esmodule = true, commonjs = true, amd = false } = options;
    const filename = context.filename;

    function isAbsolutePath(importPath: string): boolean {
      return path.isAbsolute(importPath);
    }

    function getRelativePath(absolutePath: string): string {
      const currentDir = path.dirname(filename);
      let relativePath = path.relative(currentDir, absolutePath);
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      return relativePath;
    }

    function checkImport(node: TSESTree.Node, source: TSESTree.Literal) {
      const importPath = source.value;
      if (typeof importPath !== 'string') return;

      if (isAbsolutePath(importPath)) {
        const relativePath = getRelativePath(importPath);
        context.report({
          node: source,
          messageId: 'absolutePath',
          data: {
            importPath,
            relativePath,
          },
          fix(fixer: TSESLint.RuleFixer) {
            return fixer.replaceText(source, `'${relativePath}'`);
          },
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (esmodule) {
          checkImport(node, node.source);
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (esmodule && node.source.type === 'Literal') {
          checkImport(node, node.source as TSESTree.Literal);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const calleeName = node.callee.name;

        // CommonJS require
        if (
          commonjs &&
          calleeName === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          checkImport(node, node.arguments[0] as TSESTree.Literal);
        }

        // AMD define/require
        if (amd && (calleeName === 'define' || calleeName === 'require')) {
          node.arguments.forEach((arg: TSESTree.CallExpressionArgument) => {
            if (arg.type === 'Literal') {
              checkImport(node, arg as TSESTree.Literal);
            }
          });
        }
      },
    };
  },
});
