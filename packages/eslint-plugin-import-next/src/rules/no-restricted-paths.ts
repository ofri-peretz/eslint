/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-restricted-paths
 * Enforce which files can be imported in a given folder (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'restrictedPath' | 'pathViolation' | 'zoneViolation';

export interface Options {
  /** Array of restricted path patterns */
  restricted: string[];
}

type RuleOptions = [Options?];

/**
 * Does `importPath` contain the path segments of `pattern`, in order, as whole
 * segments? `server` matches `../server/db` and `@/server`, not `./observer`
 * or `./server-utils`; `app/server` matches `./app/server`.
 */
function containsSegments(importPath: string, pattern: string): boolean {
  const path = importPath.split('/').filter(Boolean);
  const wanted = pattern.split('/').filter(Boolean);
  if (wanted.length === 0) return false;
  for (let i = 0; i + wanted.length <= path.length; i++) {
    if (wanted.every((seg, j) => path[i + j] === seg)) return true;
  }
  return false;
}

export const noRestrictedPaths = createRule<RuleOptions, MessageIds>({
  name: 'no-restricted-paths',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-restricted-paths.md',
      description: 'Enforce which files can be imported in a given folder',
    },
    hasSuggestions: false,
    messages: {
      restrictedPath: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Restricted Import Path',
        description: 'Import violates architectural boundary rules',
        severity: 'HIGH',
        fix: 'Restructure code to respect architectural boundaries',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      pathViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Architecture Violation',
        description: 'Import crosses forbidden architectural boundary',
        severity: 'HIGH',
        fix: 'Move code or adjust import to comply with architecture rules',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      zoneViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Zone Boundary Violation',
        description: 'Import violates defined architectural zones',
        severity: 'MEDIUM',
        fix: 'Restructure imports to respect zone boundaries',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          restricted: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of restricted path patterns',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ restricted: [] }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let restricted: string[];

    function checkImport(importPath: string, node: TSESTree.Node) {
      for (const pattern of restricted) {
        if (containsSegments(importPath, pattern)) {
          context.report({
            node,
            messageId: 'pathViolation',
          });
          return;
        }
      }
    }

    return {
      before() {
        const [options] = context.options;
        ({ restricted = [] } = options || {});
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath === 'string') {
          checkImport(importPath, node.source);
        }
      },

      // `export { x } from 'p'`, `export * from 'p'`
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) checkImport(node.source.value, node.source);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkImport(node.source.value, node.source);
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        const staticText = staticString(node.source);
        if (staticText !== null) checkImport(staticText, node.source);
      },

      // `import x = require('p')`
      TSExternalModuleReference(node: TSESTree.TSExternalModuleReference) {
        // TypeScript only accepts a string literal here.
        const literal = node.expression as TSESTree.StringLiteral;
        checkImport(literal.value, literal);
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          const staticText = staticString(arg);
          if (staticText !== null) {
            checkImport(staticText, arg);
          }
        }
      },
    };
  },
});
