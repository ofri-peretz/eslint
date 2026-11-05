/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-barrel-import
 * Flags imports from barrel files (index.ts that re-export multiple modules)
 *
 * IMPORTANT: This rule works in two modes:
 * 1. Explicit mode: Configure `knownBarrels` to flag specific paths
 * 2. Heuristic mode: Flags imports ending with /index
 *
 * Why This Matters:
 * - Importing from barrels forces bundlers to load ALL re-exported modules
 * - Direct imports enable optimal tree-shaking and faster builds
 * - Atlassian achieved 75% build time reduction by eliminating barrel imports
 *
 * @see https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/
 * @see https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'barrelImportDetected';

/**
 * Configuration options for no-barrel-import rule
 */
export interface NoBarrelImportOptions {
  /**
   * Regex patterns for import paths that are known barrels.
   * Required to flag imports without explicit /index suffix.
   * Example: ['^@/components$', '^@/utils$']
   */
  knownBarrels?: string[];

  /**
   * Ignore imports from node_modules.
   * Default: true
   */
  ignoreNodeModules?: boolean;

  /**
   * Packages to ignore (typically those with good tree-shaking).
   * Example: ['@mui/material', 'date-fns']
   */
  ignoredPackages?: string[];
}

type RuleOptions = [NoBarrelImportOptions?];

/**
 * Check if an import path matches any of the patterns
 */
function matchesPattern(importPath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(importPath);
    } catch {
      return importPath === pattern;
    }
  });
}

/**
 * Check if import path looks like it's from node_modules
 */
function isNodeModulesImport(importPath: string): boolean {
  // Starts with package name (not relative or absolute)
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return false;
  }
  // Could be a scoped or regular package
  return true;
}

/**
 * Check if import path explicitly references /index
 * This is a safe heuristic - explicit index imports are clearly barrel imports
 */
function endsWithIndex(importPath: string): boolean {
  // Matches: /index, /index.ts, /index.tsx, /index.js, /index.jsx, /index.mjs
  return /\/index(\.[mc]?[jt]sx?)?$/.test(importPath);
}

export const noBarrelImport = createRule<RuleOptions, MessageIds>({
  name: 'no-barrel-import',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-barrel-import.md',
      description:
        'Disallow imports from barrel files to improve build performance and tree-shaking',
    },
    messages: {
      barrelImportDetected: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Barrel Import Detected',
        description:
          "Importing from '{{importPath}}' loads an index file that may include unused modules. " +
          'Barrel imports harm build performance and prevent effective tree-shaking.',
        severity: 'LOW',
        fix:
          'Import directly from the source module instead. For example:\n' +
          "  ❌ import { Button } from '@/components';\n" +
          "  ❌ import { Button } from '@/components/index';\n" +
          "  ✅ import { Button } from '@/components/Button';",
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-barrel-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          knownBarrels: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Regex patterns for paths known to be barrels',
          },
          ignoreNodeModules: {
            type: 'boolean',
            default: true,
            description: 'Ignore imports from node_modules',
          },
          ignoredPackages: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Packages to ignore (good tree-shaking support)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      knownBarrels: [],
      ignoreNodeModules: true,
      ignoredPackages: [],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let knownBarrels: string[];
    let ignoreNodeModules: boolean;
    let ignoredPackages: string[];

    function checkImportPath(node: TSESTree.Node, importPath: string) {
      if (isNodeModulesImport(importPath)) {
        // An ignored package is ignored whatever `ignoreNodeModules` says.
        if (
          ignoredPackages.length > 0 &&
          matchesPattern(importPath, ignoredPackages)
        ) {
          return;
        }

        // Skip node_modules if configured: only flag one explicitly in
        // knownBarrels
        if (ignoreNodeModules && knownBarrels.length === 0) {
          return;
        }
      }

      // Check against known barrels first (explicit configuration)
      if (knownBarrels.length > 0 && matchesPattern(importPath, knownBarrels)) {
        context.report({
          node,
          messageId: 'barrelImportDetected',
          data: {
            importPath,
          },
        });
        return;
      }

      // Safe heuristic: only flag explicit /index imports (not directory imports)
      // We can't distinguish './utils' (directory) from './utils' (file) without FS access
      if (endsWithIndex(importPath)) {
        context.report({
          node,
          messageId: 'barrelImportDetected',
          data: {
            importPath,
          },
        });
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        ({
          knownBarrels = [],
          ignoreNodeModules = true,
          ignoredPackages = [],
        } = options || {});
      },
      // A type-only import or re-export is erased at compile time: it loads
      // nothing, barrel or not.
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (
          node.importKind === 'type' ||
          (node.specifiers.length > 0 &&
            node.specifiers.every(
              (s) => s.type === 'ImportSpecifier' && s.importKind === 'type',
            ))
        ) {
          return;
        }
        checkImportPath(node, node.source.value);
      },

      // Also check re-exports that import from barrels
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (node.exportKind === 'type') return;
        checkImportPath(node, node.source.value);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (
          !node.source ||
          node.exportKind === 'type' ||
          (node.specifiers.length > 0 &&
            node.specifiers.every((s) => s.exportKind === 'type'))
        ) {
          return;
        }
        checkImportPath(node, node.source.value);
      },

      // `import('./x')`, `require('./x')` and TS `import x = require('./x')`
      // load the barrel at runtime like a static import.
      ImportExpression(node: TSESTree.ImportExpression) {
        if (
          node.source.type === 'Literal' &&
          typeof node.source.value === 'string'
        ) {
          checkImportPath(node, node.source.value);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const arg = node.arguments[0];
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          arg.type === 'Literal' &&
          typeof arg.value === 'string'
        ) {
          checkImportPath(node, arg.value);
        }
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (
          node.importKind === 'type' ||
          node.moduleReference.type !== 'TSExternalModuleReference'
        ) {
          return;
        }
        const arg = node.moduleReference.expression as TSESTree.StringLiteral;
        checkImportPath(node, arg.value);
      },
    };
  },
});
