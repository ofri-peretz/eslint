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
    type: 'suggestion',
    docs: {
      description:
        'Disallow imports from barrel files to improve build performance and tree-shaking',
    },
    fixable: 'code',
    hasSuggestions: true,
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
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      knownBarrels = [],
      ignoreNodeModules = true,
      ignoredPackages = [],
    }: NoBarrelImportOptions = options || {};

    function checkImportPath(
      node: TSESTree.ImportDeclaration | TSESTree.ExportAllDeclaration | TSESTree.ExportNamedDeclaration,
      importPath: string,
    ) {
      // Skip node_modules if configured
      if (ignoreNodeModules && isNodeModulesImport(importPath)) {
        // Check if it's an ignored package
        if (ignoredPackages.length > 0 && matchesPattern(importPath, ignoredPackages)) {
          return;
        }

        // For node_modules, only flag if explicitly in knownBarrels
        if (knownBarrels.length === 0) {
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
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath === 'string') {
          checkImportPath(node, importPath);
        }
      },

      // Also check re-exports that import from barrels
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath === 'string') {
          checkImportPath(node, importPath);
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) {
          const importPath = node.source.value;
          if (typeof importPath === 'string') {
            checkImportPath(node, importPath);
          }
        }
      },
    };
  },
});
