/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: group-exports
 * Prefer named exports to be grouped together in a single export declaration
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/group-exports.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'groupExports';

type RuleOptions = [];

export const groupExports = createRule<RuleOptions, MessageIds>({
  name: 'group-exports',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer named exports to be grouped together in a single export declaration',
    },
    messages: {
      groupExports: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Scattered Exports',
        cwe: 'CWE-1078',
        description:
          'Multiple export statements can be grouped into a single export',
        severity: 'LOW',
        fix: 'Combine exports into: export { a, b, c }',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/group-exports.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Track separate export statements (not counting inline exports)
    const separateExports: TSESTree.ExportNamedDeclaration[] = [];
    const reExportSources = new Map<string, TSESTree.ExportNamedDeclaration[]>();

    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Only track export specifier lists, not inline declarations
        if (!node.declaration && node.specifiers.length > 0) {
          if (node.source) {
            // Re-export from another module
            const source = node.source.value as string;
            if (!reExportSources.has(source)) {
              reExportSources.set(source, []);
            }
            reExportSources.get(source)?.push(node);
          } else {
            // Local export
            separateExports.push(node);
          }
        }
      },

      'Program:exit'() {
        // Report if there are multiple separate local exports that could be combined
        if (separateExports.length > 1) {
          // Report all but the first one
          for (let i = 1; i < separateExports.length; i++) {
            context.report({
              node: separateExports[i],
              messageId: 'groupExports',
            });
          }
        }

        // Report if there are multiple re-exports from the same source
        for (const [, exports] of reExportSources) {
          if (exports.length > 1) {
            // Report all but the first one
            for (let i = 1; i < exports.length; i++) {
              context.report({
                node: exports[i],
                messageId: 'groupExports',
              });
            }
          }
        }
      },
    };
  },
});
