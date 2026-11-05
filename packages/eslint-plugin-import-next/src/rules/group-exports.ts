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
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/group-exports',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/group-exports.md',
      description:
        'Prefer named exports to be grouped together in a single export declaration',
      cwe: 'CWE-1078',
      cvss: 2.5,
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let separateExports: Record<
      'type' | 'value',
      TSESTree.ExportNamedDeclaration[]
    >;
    let reExportSources: Map<string, TSESTree.ExportNamedDeclaration[]>;

    return {
      before() {
        // Track separate export statements (not counting inline exports)
        separateExports = { type: [], value: [] };
        reExportSources = new Map<string, TSESTree.ExportNamedDeclaration[]>();
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Only track export specifier lists, not inline declarations
        if (!node.declaration && node.specifiers.length > 0) {
          // A type-only list (`export type { T }`) groups with other type-only
          // lists, a value list with value lists: merging the two takes inline
          // `type` modifiers, a style choice this rule does not make.
          const kind = node.exportKind === 'type' ? 'type' : 'value';
          if (node.source) {
            // Re-export from another module
            const source = `${kind}:${node.source.value}`;
            if (!reExportSources.has(source)) {
              reExportSources.set(source, []);
            }
            reExportSources.get(source)?.push(node);
          } else {
            // Local export
            separateExports[kind].push(node);
          }
        }
      },

      'Program:exit'() {
        // Report if there are multiple separate local exports that could be combined
        for (const lists of [separateExports.value, separateExports.type]) {
          // Report all but the first one
          for (let i = 1; i < lists.length; i++) {
            context.report({
              node: lists[i],
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
