/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: max-dependencies
 * Enforce the maximum number of dependencies a module can have (eslint-plugin-import inspired)
 */
import { builtinModules } from 'node:module';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'maxDependencies' | 'suggestRefactor' | 'dependencyAnalysis';

export interface Options {
  /** Maximum number of dependencies allowed */
  max?: number;
  /** Ignore type-only imports */
  ignoreTypeImports?: boolean;
  /** Ignore specific import sources */
  ignoreImports?: string[];
  /** Ignore files matching patterns */
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

export const maxDependencies = createRule<RuleOptions, MessageIds>({
  name: 'max-dependencies',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/max-dependencies',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/max-dependencies.md',
      description:
        'Enforce the maximum number of dependencies a module can have',
    },
    hasSuggestions: false,
    messages: {
      maxDependencies: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Too Many Dependencies',
        description: 'Module exceeds maximum dependency limit',
        severity: 'MEDIUM',
        fix: 'Refactor to reduce dependencies or increase limit for this module',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/max-dependencies.md',
      }),
      suggestRefactor: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dependency Refactoring',
        description: 'Consider breaking down module or creating barrel exports',
        severity: 'LOW',
        fix: 'Split module into smaller, focused modules',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/max-dependencies.md',
      }),
      dependencyAnalysis: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dependency Analysis',
        description: 'Review dependency usage and consider alternatives',
        severity: 'LOW',
        fix: 'Analyze if all dependencies are necessary',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/max-dependencies.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 1,
            default: 10,
            description: 'Maximum number of dependencies allowed.',
          },
          ignoreTypeImports: {
            type: 'boolean',
            default: true,
            description: 'Ignore type-only imports.',
          },
          ignoreImports: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Import sources to ignore.',
          },
          ignoreFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'File patterns to ignore.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      max: 10,
      ignoreTypeImports: true,
      ignoreImports: [],
      ignoreFiles: [],
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let max: number;
    let ignoreTypeImports: boolean;
    let ignoreImports: string[];
    let ignoreFiles: string[];
    let filename: string;
    let dependencies: Set<string>;

    /**
     * Counts external packages only. Not a package: relative and absolute
     * paths, `#` subpath imports (the package's own files), Node.js builtins
     * in any spelling (Node's own list, subpaths included, or `node:`).
     */
    function shouldCount(importPath: string, isType: boolean): boolean {
      if (ignoreImports.includes(importPath)) return false;
      if (ignoreTypeImports && isType) return false;
      if (/^[./#]/.test(importPath)) return false;
      if (importPath.startsWith('node:') || builtinModules.includes(importPath))
        return false;
      return true;
    }

    function count(source: TSESTree.Node, isType = false) {
      const importPath = staticString(source);
      if (importPath !== null && shouldCount(importPath, isType)) {
        addDependency(importPath);
      }
    }

    function addDependency(importPath: string) {
      // Extract package name from scoped packages or regular packages
      const packageName = importPath.startsWith('@')
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];

      dependencies.add(packageName);
    }

    return {
      before() {
        const [options] = context.options;
        ({
          max = 10,
          ignoreTypeImports = true,
          ignoreImports = [],
          ignoreFiles = [],
        } = options || {});

        filename = context.filename;
        if (!filename) {
          return false;
        }

        // Check if file should be ignored
        const shouldIgnoreFile = ignoreFiles.some((pattern: string) => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(filename);
          }
          return filename.includes(pattern);
        });

        if (shouldIgnoreFile) {
          return false;
        }

        dependencies = new Set<string>();
        return true;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        count(node.source, node.importKind === 'type');
      },

      // `export { x } from 'pkg'` and `export * from 'pkg'` depend on it too.
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) count(node.source, node.exportKind === 'type');
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        count(node.source, node.exportKind === 'type');
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          count(node.arguments[0]);
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        count(node.source);
      },

      // `import x = require('pkg')`
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          count(node.moduleReference.expression, node.importKind === 'type');
        }
      },

      'Program:exit'(node: TSESTree.Program) {
        const dependencyCount = dependencies.size;

        if (dependencyCount > max) {
          const dependencyList = Array.from(dependencies).join(', ');

          context.report({
            node,
            messageId: 'maxDependencies',
            data: {
              count: dependencyCount,
              max,
              dependencies: dependencyList,
              filename,
              overLimit: dependencyCount - max,
            },
          });
        }
      },
    };
  },
});
