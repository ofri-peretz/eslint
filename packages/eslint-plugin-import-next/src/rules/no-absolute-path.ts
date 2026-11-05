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
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';
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
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-absolute-path',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-absolute-path.md',
      description: 'Forbid import of modules using absolute paths',
      cwe: 'CWE-426',
      cvss: 5,
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let esmodule: boolean;
    let commonjs: boolean;
    let amd: boolean;
    let filename: string;

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

    /** `source` is any expression naming a module; only a static string is checked. */
    function checkImport(source: TSESTree.Node | null | undefined) {
      const importPath = staticString(source);
      if (!source || importPath === null) return;

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
      before() {
        const options = context.options[0] || {};
        ({ esmodule = true, commonjs = true, amd = false } = options);
        filename = context.filename;
      },
      // `esmodule`: every ES spelling that names a module.
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (esmodule) checkImport(node.source);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (esmodule) checkImport(node.source);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (esmodule) checkImport(node.source);
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        if (esmodule) checkImport(node.source);
      },

      // `commonjs`: TS `import x = require('m')` compiles to `require`.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (
          commonjs &&
          node.moduleReference.type === 'TSExternalModuleReference'
        ) {
          checkImport(node.moduleReference.expression);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const calleeName = node.callee.name;

        // CommonJS `require('m')`
        if (
          commonjs &&
          calleeName === 'require' &&
          node.arguments.length === 1
        ) {
          checkImport(node.arguments[0]);
        }

        // AMD `define([...], f)` / `require([...], f)`: the modules are the
        // elements of the dependency array.
        const deps = node.arguments[0];
        if (
          amd &&
          (calleeName === 'define' || calleeName === 'require') &&
          deps?.type === 'ArrayExpression'
        ) {
          for (const element of deps.elements) checkImport(element);
        }
      },
    };
  },
});
