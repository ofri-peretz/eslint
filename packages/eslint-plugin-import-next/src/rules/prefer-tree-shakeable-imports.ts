/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-tree-shakeable-imports
 * Detects import patterns that prevent effective tree-shaking
 *
 * Why This Matters:
 * - Namespace imports (import * as) prevent tree-shaking
 * - Default imports from large packages include entire library
 * - Direct/named imports enable optimal dead code elimination
 *
 * @see https://webpack.js.org/guides/tree-shaking/
 * @see https://rollupjs.org/faqs/#why-do-additional-imports-turn-up-in-my-entry-chunks-when-code-splitting
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'namespaceImport' | 'defaultImportFromLargePackage';

/**
 * Configuration for packages that should use tree-shakeable imports
 */
interface PackageConfig {
  /** Package name or pattern */
  name: string;
  /** Preferred import pattern (if subpath) */
  subpathPattern?: string;
  /** Prefer named imports */
  preferNamed?: boolean;
}

/**
 * Configuration options for prefer-tree-shakeable-imports rule
 */
export interface PreferTreeShakeableOptions {
  /**
   * Packages to enforce tree-shakeable imports on.
   */
  targetPackages?: PackageConfig[];

  /**
   * Block all namespace imports from any package.
   * Default: false
   */
  blockAllNamespaceImports?: boolean;
}

type RuleOptions = [PreferTreeShakeableOptions?];

// Known large packages that benefit from subpath/named imports
const KNOWN_LARGE_PACKAGES: PackageConfig[] = [
  { name: 'lodash', subpathPattern: 'lodash/{method}', preferNamed: false },
  { name: '@mui/material', subpathPattern: '@mui/material/{Component}', preferNamed: true },
  { name: '@mui/icons-material', subpathPattern: '@mui/icons-material/{Icon}', preferNamed: false },
  { name: '@heroicons/react', preferNamed: false },
  { name: 'date-fns', preferNamed: true },
  { name: 'rxjs', preferNamed: true },
  { name: 'rxjs/operators', preferNamed: true },
  { name: 'ramda', subpathPattern: 'ramda/src/{fn}', preferNamed: true },
  { name: '@fortawesome/free-solid-svg-icons', preferNamed: true },
  { name: '@fortawesome/free-regular-svg-icons', preferNamed: true },
  { name: 'antd', preferNamed: true },
  { name: '@ant-design/icons', preferNamed: true },
];

/**
 * Check if import is from a target package
 */
function matchesPackage(importPath: string, packages: PackageConfig[]): PackageConfig | null {
  for (const pkg of packages) {
    // Exact match or scoped package match
    if (importPath === pkg.name || importPath.startsWith(`${pkg.name}/`)) {
      return pkg;
    }
  }
  return null;
}

export const preferTreeShakeableImports = createRule<RuleOptions, MessageIds>({
  name: 'prefer-tree-shakeable-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer import patterns that enable effective tree-shaking',
    },
    hasSuggestions: true,
    messages: {
      namespaceImport: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Namespace Import Blocks Tree-Shaking',
        description:
          "Namespace import 'import * as {{alias}} from \"{{source}}\"' prevents tree-shaking. " +
          'The bundler cannot determine which exports are actually used.',
        severity: 'MEDIUM',
        fix:
          'Use named imports instead:\n' +
          "  ❌ import * as utils from 'lodash';\n" +
          "  ✅ import { debounce, throttle } from 'lodash';",
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/prefer-tree-shakeable-imports.md',
      }),
      defaultImportFromLargePackage: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Default Import from Large Package',
        description:
          "Default import from '{{source}}' may include the entire library. " +
          'This package ({{packageHint}}) works better with named or subpath imports.',
        severity: 'LOW',
        fix:
          'Use named imports or subpath imports:\n' +
          "  ❌ import _ from 'lodash';\n" +
          "  ✅ import { debounce } from 'lodash';\n" +
          "  ✅ import debounce from 'lodash/debounce';",
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/prefer-tree-shakeable-imports.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          targetPackages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                subpathPattern: { type: 'string' },
                preferNamed: { type: 'boolean' },
              },
              required: ['name'],
            },
            default: [],
            description: 'Packages to enforce tree-shakeable imports',
          },
          blockAllNamespaceImports: {
            type: 'boolean',
            default: false,
            description: 'Block all namespace imports',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      targetPackages: KNOWN_LARGE_PACKAGES,
      blockAllNamespaceImports: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      targetPackages = KNOWN_LARGE_PACKAGES,
      blockAllNamespaceImports = false,
    }: PreferTreeShakeableOptions = options || {};

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath !== 'string') return;

        // Check for namespace imports
        const namespaceSpecifier = node.specifiers.find(
          (spec: TSESTree.ImportClause): spec is TSESTree.ImportNamespaceSpecifier =>
            spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier,
        );

        if (namespaceSpecifier) {
          const matchedPackage = matchesPackage(importPath, targetPackages);

          // Flag namespace imports from target packages
          if (matchedPackage || blockAllNamespaceImports) {
            context.report({
              node,
              messageId: 'namespaceImport',
              data: {
                alias: namespaceSpecifier.local.name,
                source: importPath,
              },
            });
            return;
          }
        }

        // Check for default imports from large packages
        const defaultSpecifier = node.specifiers.find(
          (spec: TSESTree.ImportClause): spec is TSESTree.ImportDefaultSpecifier =>
            spec.type === AST_NODE_TYPES.ImportDefaultSpecifier,
        );

        if (defaultSpecifier) {
          const matchedPackage = matchesPackage(importPath, targetPackages);

          // Only flag if importing from root of package (not subpath)
          if (matchedPackage && importPath === matchedPackage.name) {
            context.report({
              node,
              messageId: 'defaultImportFromLargePackage',
              data: {
                source: importPath,
                packageHint: matchedPackage.subpathPattern || 'use named imports',
              },
            });
          }
        }
      },
    };
  },
});
