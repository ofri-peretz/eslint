/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-full-package-import
 * Blocks full package imports from known large packages that should use subpath imports
 *
 * Why This Matters:
 * - Full imports from large packages include ALL exports in the bundle
 * - Subpath imports enable proper tree-shaking
 * - Bundle size can be reduced by 50-80% with proper imports
 *
 * @see https://webpack.js.org/guides/tree-shaking/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'fullPackageImport';

/**
 * Configuration for blocked packages
 */
interface BlockedPackage {
  /** Package name to block */
  name: string;
  /** Suggested import pattern */
  suggestion: string;
  /** Example of correct import */
  example?: string;
}

/**
 * Configuration options for no-full-package-import rule
 */
export interface NoFullPackageImportOptions {
  /**
   * Packages to block full imports from.
   */
  blockedPackages?: BlockedPackage[];
}

type RuleOptions = [NoFullPackageImportOptions?];

// Known large packages that should use subpath/named imports
const DEFAULT_BLOCKED_PACKAGES: BlockedPackage[] = [
  {
    name: 'lodash',
    suggestion: 'Use subpath imports like lodash/debounce',
    example: "import debounce from 'lodash/debounce';",
  },
  {
    name: 'lodash-es',
    suggestion: 'Use named imports for tree-shaking',
    example: "import { debounce } from 'lodash-es';",
  },
  {
    name: 'rxjs',
    suggestion: 'Use named imports from rxjs',
    example: "import { Observable, map } from 'rxjs';",
  },
  {
    name: 'ramda',
    suggestion: 'Use subpath imports like ramda/src/compose',
    example: "import compose from 'ramda/src/compose';",
  },
  {
    name: 'moment',
    suggestion: 'Consider migrating to date-fns or dayjs for smaller bundles',
    example: "import { format } from 'date-fns';",
  },
  {
    name: 'underscore',
    suggestion: 'Consider migrating to lodash-es or native methods',
    example: 'array.filter(fn) instead of _.filter(array, fn)',
  },
  {
    name: '@fortawesome/free-solid-svg-icons',
    suggestion: 'Import individual icons',
    example: "import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';",
  },
  {
    name: '@fortawesome/free-regular-svg-icons',
    suggestion: 'Import individual icons',
    example: "import { faCircle } from '@fortawesome/free-regular-svg-icons/faCircle';",
  },
  {
    name: 'aws-sdk',
    suggestion: 'Use AWS SDK v3 with modular imports',
    example: "import { S3Client } from '@aws-sdk/client-s3';",
  },
];

/**
 * Check if import is a full package import (not a subpath)
 */
function isFullPackageImport(importPath: string, packageName: string): boolean {
  // Exact match means full package import
  return importPath === packageName;
}

/**
 * Check if import uses namespace pattern
 */
function hasNamespaceImport(node: TSESTree.ImportDeclaration): boolean {
  return node.specifiers.some(
    (spec: TSESTree.ImportClause) => spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier,
  );
}

/**
 * Check if import uses default pattern
 */
function hasDefaultImport(node: TSESTree.ImportDeclaration): boolean {
  return node.specifiers.some(
    (spec: TSESTree.ImportClause) => spec.type === AST_NODE_TYPES.ImportDefaultSpecifier,
  );
}

export const noFullPackageImport = createRule<RuleOptions, MessageIds>({
  name: 'no-full-package-import',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow full package imports from known large packages that prevent tree-shaking',
    },
    hasSuggestions: true,
    messages: {
      fullPackageImport: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Full Package Import Blocks Tree-Shaking',
        description:
          "Importing the entire '{{packageName}}' package prevents tree-shaking and bloats your bundle. {{suggestion}}",
        severity: 'MEDIUM',
        fix: '{{example}}',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-full-package-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          blockedPackages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                suggestion: { type: 'string' },
                example: { type: 'string' },
              },
              required: ['name', 'suggestion'],
            },
            default: [],
            description: 'Packages to block full imports from',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      blockedPackages: DEFAULT_BLOCKED_PACKAGES,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      blockedPackages = DEFAULT_BLOCKED_PACKAGES,
    }: NoFullPackageImportOptions = options || {};

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath !== 'string') return;

        // Check against blocked packages
        for (const blocked of blockedPackages) {
          if (!isFullPackageImport(importPath, blocked.name)) {
            continue;
          }

          // Only flag namespace or default imports from full package path
          // Named imports might be tree-shakeable depending on the package
          if (hasNamespaceImport(node) || hasDefaultImport(node)) {
            context.report({
              node,
              messageId: 'fullPackageImport',
              data: {
                packageName: blocked.name,
                suggestion: blocked.suggestion,
                example: blocked.example || 'Use subpath or named imports',
              },
            });
          }
        }
      },
    };
  },
});
