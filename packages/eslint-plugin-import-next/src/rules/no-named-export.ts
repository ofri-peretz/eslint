/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-named-export
 * Prevents named exports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { boundNames } from '../utils/bindings';
import { matchesAnyFilePattern } from '../utils/file-patterns';

type MessageIds = 'namedExport' | 'suggestDefault';

export interface Options {
  /** Allow named exports in specific files */
  allowInFiles?: string[];
  /** Allow specific named exports */
  allowNames?: string[];
  /** Allow named exports for specific patterns */
  allowPatterns?: string[];
  /** Has no effect; accepted so existing configs keep validating */
  suggestDefault?: boolean;
}

type RuleOptions = [Options?];

export const noNamedExport = createRule<RuleOptions, MessageIds>({
  name: 'no-named-export',
  meta: {
    interop: {
      runtimes: ['eslint'],
      nativeEquivalent: 'import/no-named-export',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-named-export.md',
      description: 'Prevents named exports',
    },
    hasSuggestions: false,
    messages: {
      namedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named Export Detected',
        description: 'Named export violates import style guidelines',
        severity: 'MEDIUM',
        fix: 'Use default export instead of named export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md',
      }),
      suggestDefault: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Default Export',
        description: 'Convert to default export',
        severity: 'LOW',
        fix: 'export default MyComponent;',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'File globs (or path substrings) where named exports are allowed.',
          },
          allowNames: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Exported names that are allowed.',
          },
          allowPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'More file globs (or path substrings) where named exports are allowed.',
          },
          suggestDefault: {
            type: 'boolean',
            default: true,
            description:
              'Has no effect; accepted so existing configs keep validating.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInFiles: [],
      allowNames: [],
      allowPatterns: [],
      suggestDefault: true,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowInFiles: string[];
    let allowNames: string[];
    let allowPatterns: string[];
    let filename: string;

    function fileAllowed(): boolean {
      return (
        !!filename &&
        (matchesAnyFilePattern(filename, allowInFiles) ||
          matchesAnyFilePattern(filename, allowPatterns))
      );
    }

    /**
     * Report a value export published under `names` (none known for
     * `export * from`), unless every name is in `allowNames`.
     */
    function check(node: TSESTree.Node, names: string[]) {
      if (names.length > 0 && names.every((n) => allowNames.includes(n))) {
        return;
      }
      context.report({ node, messageId: 'namedExport' });
    }

    const nameOf = (n: TSESTree.Identifier | TSESTree.StringLiteral) =>
      n.type === 'Identifier' ? n.name : n.value;

    return {
      before() {
        const [options] = context.options;
        ({
          allowInFiles = [],
          allowNames = [],
          allowPatterns = [],
          // suggestDefault has no effect (accepted so configs validate)
        } = options || {});

        filename = context.filename;
        return !fileAllowed();
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Type-only exports have no default-export counterpart to prefer.
        if (node.exportKind === 'type') return;

        for (const specifier of node.specifiers) {
          const exported = nameOf(specifier.exported);
          // Exported AS default is the default export, not a named one.
          if (exported !== 'default' && specifier.exportKind !== 'type') {
            check(specifier, [exported]);
          }
        }

        const declaration = node.declaration;
        if (!declaration) return;
        switch (declaration.type) {
          case 'VariableDeclaration':
            // Report on each variable declarator individually
            for (const declarator of declaration.declarations) {
              check(declarator, boundNames(declarator.id));
            }
            break;
          case 'FunctionDeclaration':
          case 'ClassDeclaration':
            // (An overload signature is a TSDeclareFunction; the
            // implementation below it is the export.)
            // A function or class in a named export always has a name.
            check(declaration, [(declaration.id as TSESTree.Identifier).name]);
            break;
          case 'TSEnumDeclaration':
            // A `const enum` is erased like a type; a plain enum is a value.
            if (!declaration.const) check(declaration, [declaration.id.name]);
            break;
          default:
            // Interfaces, type aliases, namespaces: types or ambient.
            break;
        }
      },
      // `export * from 'm'` publishes every name of `m`; `export * as ns`
      // publishes `ns`. Only `export * as default` is the default export.
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (node.exportKind === 'type') return;
        const exported = node.exported ? nameOf(node.exported) : undefined;
        if (exported === 'default') return;
        check(node, exported ? [exported] : []);
      },
    };
  },
});
