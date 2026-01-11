/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-direct-import
 * Suggests direct imports instead of importing from barrel files/directories
 *
 * This rule provides autofix capabilities to convert:
 *   import { Button } from '@/components';
 * To:
 *   import { Button } from '@/components/Button';
 *
 * Why This Matters:
 * - Direct imports enable optimal tree-shaking
 * - Faster build times (bundler doesn't parse unused modules)
 * - Clearer dependency graph
 *
 * @see https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'preferDirectImport';

/**
 * Mapping configuration for known barrel paths to direct import paths
 */
interface DirectImportMapping {
  /** Pattern to match barrel imports (regex string) */
  barrel: string;
  /** Template for direct import path. Use {name} for the imported identifier */
  directPath: string;
}

/**
 * Configuration options for prefer-direct-import rule
 */
export interface PreferDirectImportOptions {
  /**
   * Mapping of barrel paths to direct import patterns.
   * Example: [{ barrel: '^@/components$', directPath: '@/components/{name}' }]
   */
  mappings?: DirectImportMapping[];

  /**
   * Auto-fix the imports when possible.
   * Default: true
   */
  autoFix?: boolean;
}

type RuleOptions = [PreferDirectImportOptions?];

// Common barrel-to-direct mappings
const DEFAULT_MAPPINGS: DirectImportMapping[] = [
  // React component libraries commonly use this pattern
  { barrel: '^@/components$', directPath: '@/components/{name}' },
  { barrel: '^@/hooks$', directPath: '@/hooks/{name}' },
  { barrel: '^@/utils$', directPath: '@/utils/{name}' },
  { barrel: '^@/lib$', directPath: '@/lib/{name}' },
  { barrel: '^~/components$', directPath: '~/components/{name}' },
  { barrel: '^~/hooks$', directPath: '~/hooks/{name}' },
];

/**
 * Find a matching mapping for an import path
 */
function findMapping(
  importPath: string,
  mappings: DirectImportMapping[],
): DirectImportMapping | null {
  for (const mapping of mappings) {
    try {
      const regex = new RegExp(mapping.barrel);
      if (regex.test(importPath)) {
        return mapping;
      }
    } catch {
      if (importPath === mapping.barrel) {
        return mapping;
      }
    }
  }
  return null;
}

/**
 * Generate direct import path from mapping template
 */
function generateDirectPath(template: string, importedName: string): string {
  return template.replace('{name}', importedName);
}

export const preferDirectImport = createRule<RuleOptions, MessageIds>({
  name: 'prefer-direct-import',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer direct imports over barrel imports for better tree-shaking and build performance',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferDirectImport: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Prefer Direct Import',
        description:
          "Import '{{importedName}}' directly from '{{suggestedPath}}' instead of from the barrel file '{{barrelPath}}'.",
        severity: 'LOW',
        fix:
          'Use direct imports for better tree-shaking:\n' +
          "  ❌ import { Button } from '@/components';\n" +
          "  ✅ import { Button } from '@/components/Button';",
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/prefer-direct-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          mappings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                barrel: { type: 'string' },
                directPath: { type: 'string' },
              },
              required: ['barrel', 'directPath'],
            },
            default: [],
            description: 'Mapping of barrel paths to direct import patterns',
          },
          autoFix: {
            type: 'boolean',
            default: true,
            description: 'Auto-fix the imports when possible',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      mappings: DEFAULT_MAPPINGS,
      autoFix: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const opts: PreferDirectImportOptions = options || {};
    const mappings = opts.mappings ?? DEFAULT_MAPPINGS;
    const autoFix = opts.autoFix ?? true;

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath !== 'string') return;

        // Skip type-only imports (they don't affect bundle size)
        if (node.importKind === 'type') return;

        // Find matching barrel mapping
        const mapping = findMapping(importPath, mappings);
        if (!mapping) return;

        // Only process named imports (not default or namespace)
        const namedImports = node.specifiers.filter(
          (spec: TSESTree.ImportClause): spec is TSESTree.ImportSpecifier =>
            spec.type === 'ImportSpecifier',
        );

        if (namedImports.length === 0) return;

        // For single named import, we can suggest/fix the direct path
        if (namedImports.length === 1) {
          const importedName = namedImports[0].imported.type === 'Identifier'
            ? namedImports[0].imported.name
            : namedImports[0].imported.value;
          const suggestedPath = generateDirectPath(mapping.directPath, importedName);

          context.report({
            node,
            messageId: 'preferDirectImport',
            data: {
              importedName,
              suggestedPath,
              barrelPath: importPath,
            },
            fix: autoFix
              ? (fixer: TSESLint.RuleFixer) => {
                  // Replace the import path
                  return fixer.replaceText(node.source, `'${suggestedPath}'`);
                }
              : undefined,
            suggest: !autoFix
              ? [
                  {
                    messageId: 'preferDirectImport',
                    data: {
                      importedName,
                      suggestedPath,
                      barrelPath: importPath,
                    },
                    fix: (fixer: TSESLint.RuleFixer) => {
                      return fixer.replaceText(node.source, `'${suggestedPath}'`);
                    },
                  },
                ]
              : undefined,
          });
        } else {
          // Multiple named imports - suggest splitting them
          for (const spec of namedImports) {
            const importedName = spec.imported.type === 'Identifier'
              ? spec.imported.name
              : spec.imported.value;
            const suggestedPath = generateDirectPath(mapping.directPath, importedName);

            context.report({
              node: spec,
              messageId: 'preferDirectImport',
              data: {
                importedName,
                suggestedPath,
                barrelPath: importPath,
              },
              // Don't auto-fix multiple imports as it requires splitting the statement
              suggest: [
                {
                  messageId: 'preferDirectImport',
                  data: {
                    importedName,
                    suggestedPath,
                    barrelPath: importPath,
                  },
                  fix: () => null, // Manual fix required for multi-import
                },
              ],
            });
          }
        }
      },
    };
  },
});
