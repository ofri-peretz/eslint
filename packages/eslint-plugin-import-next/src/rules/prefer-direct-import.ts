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
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/prefer-direct-import.md',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let mappings: DirectImportMapping[];
    let autoFix: boolean;

    /**
     * Report each named value binding `node` takes from a mapped barrel.
     * `named` pairs the specifier with the name the barrel exports. Only a
     * declaration whose single specifier is that binding is fixed: rewriting
     * the source of a declaration that takes more would move the others too.
     */
    function checkNamed(
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      named: [TSESTree.Node, TSESTree.Identifier | TSESTree.StringLiteral][],
    ): void {
      const source = node.source as TSESTree.StringLiteral;
      const importPath = source.value;
      const mapping = findMapping(importPath, mappings);
      if (!mapping || named.length === 0) return;

      if (named.length === 1 && node.specifiers.length === 1) {
        const [, nameNode] = named[0];
        const importedName =
          nameNode.type === 'Identifier' ? nameNode.name : nameNode.value;
        const suggestedPath = generateDirectPath(
          mapping.directPath,
          importedName,
        );
        const data = { importedName, suggestedPath, barrelPath: importPath };
        const fix = (fixer: TSESLint.RuleFixer) =>
          fixer.replaceText(source, `'${suggestedPath}'`);
        context.report({
          node,
          messageId: 'preferDirectImport',
          data,
          fix: autoFix ? fix : undefined,
          suggest: !autoFix
            ? [{ messageId: 'preferDirectImport', data, fix }]
            : undefined,
        });
        return;
      }

      // Several bindings: report each; the split is a manual change.
      for (const [spec, nameNode] of named) {
        const importedName =
          nameNode.type === 'Identifier' ? nameNode.name : nameNode.value;
        const suggestedPath = generateDirectPath(
          mapping.directPath,
          importedName,
        );
        const data = { importedName, suggestedPath, barrelPath: importPath };
        context.report({
          node: spec,
          messageId: 'preferDirectImport',
          data,
          suggest: [
            {
              messageId: 'preferDirectImport',
              data,
              fix: () => null, // Manual fix required for multi-import
            },
          ],
        });
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const opts: PreferDirectImportOptions = options || {};
        mappings = opts.mappings ?? DEFAULT_MAPPINGS;
        autoFix = opts.autoFix ?? true;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Skip type-only imports (they don't affect bundle size)
        if (node.importKind === 'type') return;
        // Only named value imports map to a direct path: not default or
        // namespace ones, and not inline `type` ones (erased).
        const named = node.specifiers.filter(
          (spec): spec is TSESTree.ImportSpecifier =>
            spec.type === 'ImportSpecifier' && spec.importKind !== 'type',
        );
        checkNamed(
          node,
          named.map((spec) => [spec, spec.imported]),
        );
      },

      // `export { Button } from '@/ui'` passes the barrel through the same way.
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!node.source || node.exportKind === 'type') return;
        const named = node.specifiers.filter(
          (spec) => spec.exportKind !== 'type',
        );
        checkNamed(
          node,
          named.map((spec) => [spec, spec.local]),
        );
      },
    };
  },
});
