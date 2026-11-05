/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-default-export
 * Prefer a default export if module exports a single name (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { boundNames } from '../utils/bindings';
import { matchesAnyFilePattern } from '../utils/file-patterns';

type MessageIds =
  'preferDefaultExport' | 'singleNamedExport' | 'multipleNamedToDefault';

export interface Options {
  /** Target file types to check */
  target?: 'always' | 'single' | 'as-needed';
  /** Ignore files matching patterns */
  ignoreFiles?: string[];
  /** Allow named exports in specific contexts */
  allowNamedExports?: boolean;
}

type RuleOptions = [Options?];

export const preferDefaultExport = createRule<RuleOptions, MessageIds>({
  name: 'prefer-default-export',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/prefer-default-export',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/prefer-default-export.md',
      description: 'Prefer a default export if module exports a single name',
    },
    hasSuggestions: true,
    messages: {
      preferDefaultExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Prefer Default Export',
        description: 'Single named export should be a default export',
        severity: 'LOW',
        fix: 'Convert named export to default export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md',
      }),
      singleNamedExport: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Single Export Pattern',
        description: 'Module exports single item that could be default export',
        severity: 'LOW',
        fix: 'Consider using default export for cleaner imports',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md',
      }),
      multipleNamedToDefault: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Multiple Named Exports',
        description:
          'Consider consolidating related exports into default export',
        severity: 'LOW',
        fix: 'Group related exports as named properties of default export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['always', 'single', 'as-needed'],
            default: 'single',
            description:
              'When to enforce default exports: always (any named export and no default), single (exactly one exported name), as-needed (same as single)',
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'File globs (or path substrings) to ignore',
          },
          allowNamedExports: {
            type: 'boolean',
            default: false,
            description: 'Allow named exports without warnings',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      target: 'single',
      ignoreFiles: [],
      allowNamedExports: false,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let target: 'always' | 'single' | 'as-needed';
    let ignoreFiles: string[];
    let allowNamedExports: boolean;
    let filename: string;
    let namedExports: Map<string, TSESTree.Node>;
    let defaultExportNode: TSESTree.Node | null;
    /** `export * from 'm'` publishes names this file cannot see. */
    let hasStarExport: boolean;

    function shouldIgnoreFile(): boolean {
      return matchesAnyFilePattern(filename, ignoreFiles);
    }

    function addNamedExport(name: string, exportNode: TSESTree.Node) {
      namedExports.set(name, exportNode);
    }

    const nameOf = (n: TSESTree.Identifier | TSESTree.StringLiteral) =>
      n.type === 'Identifier' ? n.name : n.value;

    function checkSingleExport() {
      // `as-needed` is `single`: a default export is needed exactly when the
      // module publishes one name.
      if (
        (target === 'single' || target === 'as-needed') &&
        namedExports.size === 1 &&
        !defaultExportNode &&
        !hasStarExport
      ) {
        // Find the export node to report on
        const [exportName, exportNode] = Array.from(namedExports.entries())[0];

        // Report on the single named export
        context.report({
          node: exportNode,
          messageId: 'preferDefaultExport',
          data: {
            exportName,
            exportCount: namedExports.size,
            suggestion: 'Convert to default export for cleaner imports',
            benefit:
              'Default exports provide cleaner import syntax and better tree-shaking',
          },
          suggest: [
            {
              messageId: 'preferDefaultExport',
              fix(fixer: TSESLint.RuleFixer) {
                return fixer.insertTextBefore(
                  exportNode,
                  '// TODO: Convert named export to default export\n',
                );
              },
            },
          ],
        });
      }
    }

    return {
      before() {
        const [options] = context.options;
        ({
          target = 'single',
          ignoreFiles = [],
          allowNamedExports = false,
        } = options || {});

        filename = context.filename;
        if (!filename) {
          return false;
        }

        if (shouldIgnoreFile() || allowNamedExports) {
          return false;
        }

        // Track exports in this module with their nodes
        namedExports = new Map<string, TSESTree.Node>();
        defaultExportNode = null;
        hasStarExport = false;
        return true;
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Skip TypeScript type-only exports
        if (node.exportKind === 'type') {
          return;
        }

        // Every name the module publishes counts, re-exports included
        // (`export { b } from './m'` is a name of this module too). A name
        // published AS `default` is the default export.
        for (const specifier of node.specifiers) {
          if (specifier.exportKind === 'type') continue;
          const exported = nameOf(specifier.exported);
          if (exported === 'default') defaultExportNode = node;
          else addNamedExport(exported, node);
        }

        const declaration = node.declaration;
        if (!declaration) return;
        switch (declaration.type) {
          case 'VariableDeclaration':
            for (const decl of declaration.declarations) {
              for (const name of boundNames(decl.id))
                addNamedExport(name, node);
            }
            break;
          case 'FunctionDeclaration':
          case 'ClassDeclaration':
            // (An overload signature is a TSDeclareFunction; the
            // implementation below it is the export.)
            // A function or class in a named export always has a name.
            addNamedExport((declaration.id as TSESTree.Identifier).name, node);
            break;
          case 'TSEnumDeclaration':
            // A `const enum` is erased like a type; a plain enum is a value.
            if (!declaration.const) addNamedExport(declaration.id.name, node);
            break;
          default:
            // Interfaces, type aliases, namespaces: not values.
            break;
        }
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (node.exportKind === 'type') return;
        if (!node.exported) {
          hasStarExport = true;
          return;
        }
        const exported = nameOf(node.exported);
        if (exported === 'default') defaultExportNode = node;
        else addNamedExport(exported, node);
      },
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        defaultExportNode = node;
      },

      // At the end of the file, analyze the export pattern
      'Program:exit'(node: TSESTree.Program) {
        if (
          target === 'always' &&
          namedExports.size > 0 &&
          !defaultExportNode
        ) {
          context.report({
            node,
            messageId: 'multipleNamedToDefault',
            data: {
              exportCount: namedExports.size,
              exports: Array.from(namedExports).join(', '),
              suggestion:
                'Consider grouping related exports as a default export object',
            },
          });
        } else {
          checkSingleExport();
        }
      },
    };
  },
});
