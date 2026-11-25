/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unassigned-import
 * Prevents unassigned imports (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  staticString,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import path from 'node:path';

type MessageIds = 'unassignedImport' | 'sideEffectOnly' | 'missingAssignment';

export interface Options {
  /** Allow specific modules to be imported without assignment */
  allowModules?: string[];
  /**
   * eslint-plugin-import: globs of the modules that may be imported without
   * assignment. A package specifier is matched as written (`foo/**`); a
   * relative or absolute one as the absolute path it names, against the glob
   * as written or relative to the working directory (`src/styles/**`).
   */
  allow?: string[];
  /**
   * In eslint-plugin-import's schema, with no effect there or here: accepted
   * so a carried-over config loads.
   */
  devDependencies?: boolean | string[];
  optionalDependencies?: boolean | string[];
  peerDependencies?: boolean | string[];
}

/** eslint-plugin-import's schema for its three no-op dependency keys. */
const NO_OP = {
  type: ['boolean', 'array'] as ('boolean' | 'array')[],
  items: { type: 'string' as const },
  description:
    'Accepted for eslint-plugin-import compatibility; has no effect (as there).',
};

type RuleOptions = [Options?];

export const noUnassignedImport = createRule<RuleOptions, MessageIds>({
  name: 'no-unassigned-import',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-unassigned-import',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-unassigned-import.md',
      description: 'Prevents unassigned imports',
    },
    hasSuggestions: false,
    messages: {
      unassignedImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Unassigned Import',
        description: 'Import statement without variable assignment',
        severity: 'MEDIUM',
        fix: 'Assign import to variable or use side-effect comment',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
      sideEffectOnly: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Side Effect Import',
        description: 'Import for side effects should be documented',
        severity: 'LOW',
        fix: 'Add comment explaining side effect or assign to variable',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
      missingAssignment: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Import Assignment',
        description: 'Import requires explicit variable assignment',
        severity: 'HIGH',
        fix: 'Import must be assigned to variable for tracking',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-unassigned-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowModules: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Allow specific modules to be imported without assignment.',
          },
          allow: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Globs of modules that may be imported without assignment: a package as written, a relative path as the absolute path it names.',
          },
          devDependencies: NO_OP,
          optionalDependencies: NO_OP,
          peerDependencies: NO_OP,
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowModules: [],
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowModules: string[];
    let allow: string[];

    /** eslint-plugin-import's `testIsAllow`. */
    function allowedByGlob(importPath: string): boolean {
      const target =
        importPath.startsWith('.') || importPath.startsWith('/')
          ? path.resolve(path.dirname(context.filename), importPath)
          : importPath;
      return allow.some(
        (glob) =>
          path.matchesGlob(target, glob) ||
          path.matchesGlob(target, path.join(process.cwd(), glob)),
      );
    }

    function shouldAllow(importPath: string): boolean {
      return allowModules.includes(importPath) || allowedByGlob(importPath);
    }

    return {
      before() {
        const [options] = context.options;
        ({ allowModules = [], allow = [] } = options || {});
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath !== 'string') {
          return;
        }

        if (shouldAllow(importPath)) {
          return;
        }

        // Check if import has any specifiers
        const hasSpecifiers = node.specifiers && node.specifiers.length > 0;

        if (!hasSpecifiers) {
          // This is a bare import like: import 'module'
          context.report({
            node: node.source,
            messageId: 'unassignedImport',
          });
        }
      },

      // Also check require() calls
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          const staticText = staticString(arg);
          if (staticText !== null) {
            if (!shouldAllow(staticText)) {
              const parent = node.parent;
              // Only report if the parent is an ExpressionStatement
              // This strictly catches `require('foo');` which is a side-effect import.
              // Any other parent (VariableDecl, Assignment, Call, Conditional, etc.) means it's used.
              if (
                parent &&
                parent.type === AST_NODE_TYPES.ExpressionStatement
              ) {
                context.report({
                  node: arg,
                  messageId: 'unassignedImport',
                });
              }
              // Also check SequenceExpression: (a, require('b')) -> b is returned, a is unassigned.
              // But strictly `no-unassigned-import` might only care about top level.
              // For safety and compatibility, we report if it's in a sequence and NOT the last item.
              else if (
                parent &&
                parent.type === AST_NODE_TYPES.SequenceExpression
              ) {
                const expressions = parent.expressions;
                if (expressions[expressions.length - 1] !== node) {
                  context.report({
                    node: arg,
                    messageId: 'unassignedImport',
                  });
                }
              }
            }
          }
        }
      },
    };
  },
});
