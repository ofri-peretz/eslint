/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-legacy-imports
 * Detects imports from deprecated internal paths and suggests alternatives
 *
 * Why This Matters:
 * - Large codebases accumulate technical debt via legacy import paths
 * - Developers unaware of new APIs continue using deprecated patterns
 * - Migration efforts stall without automated enforcement
 * - Helps track deprecation progress with actionable error counts
 *
 * @see https://semver.org/spec/v2.0.0.html#spec-item-8
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'legacyImport';

/**
 * Legacy import mapping
 */
interface LegacyMapping {
  /** Deprecated import pattern (regex or string) */
  deprecated: string;
  /** Suggested replacement import */
  replacement: string;
  /** Reason for deprecation */
  reason?: string;
  /** Deprecation date (for tracking) */
  since?: string;
  /** Deadline for migration (optional) */
  deadline?: string;
}

/**
 * Configuration options for no-legacy-imports rule
 */
export interface NoLegacyImportsOptions {
  /** Legacy import mappings */
  mappings: LegacyMapping[];
  /** Severity level for the deprecation */
  severity?: 'warn' | 'error';
}

type RuleOptions = [NoLegacyImportsOptions];

/**
 * Check if import matches a legacy pattern
 */
function matchLegacyPattern(
  importPath: string,
  pattern: string,
): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(importPath);
  } catch {
    // Fallback to exact match
    return importPath === pattern || importPath.startsWith(pattern);
  }
}

export const noLegacyImports = createRule<RuleOptions, MessageIds>({
  name: 'no-legacy-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect imports from deprecated internal paths and suggest alternatives',
    },
    fixable: 'code',
    messages: {
      legacyImport: formatLLMMessage({
        icon: MessageIcons.DEPRECATION,
        issueName: 'Legacy Import Detected',
        description:
          "The import '{{deprecated}}' is deprecated{{reason}}. " +
          "Please use '{{replacement}}' instead.{{deadline}}",
        severity: 'MEDIUM',
        fix:
          'Replace the import:\n' +
          "  - import { X } from '{{deprecated}}';\n" +
          "  + import { X } from '{{replacement}}';",
        documentationLink: '',
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
                deprecated: { type: 'string' },
                replacement: { type: 'string' },
                reason: { type: 'string' },
                since: { type: 'string' },
                deadline: { type: 'string' },
              },
              required: ['deprecated', 'replacement'],
            },
          },
          severity: {
            type: 'string',
            enum: ['warn', 'error'],
            default: 'warn',
          },
        },
        required: ['mappings'],
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      mappings: [],
      severity: 'warn',
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options]: readonly [NoLegacyImportsOptions],
  ) {
    const { mappings } = options;

    function checkImport(importPath: string, node: TSESTree.Node, sourceNode: TSESTree.Literal) {
      for (const mapping of mappings) {
        if (matchLegacyPattern(importPath, mapping.deprecated)) {
          const reasonText = mapping.reason ? ` (${mapping.reason})` : '';
          const deadlineText = mapping.deadline
            ? ` Migration deadline: ${mapping.deadline}.`
            : '';

          context.report({
            node,
            messageId: 'legacyImport',
            data: {
              deprecated: importPath,
              replacement: mapping.replacement,
              reason: reasonText,
              deadline: deadlineText,
            },
            fix: (fixer: TSESLint.RuleFixer) => {
              // Simple replacement - replace the import path
              return fixer.replaceText(sourceNode, `'${mapping.replacement}'`);
            },
          });
          break; // Only report first matching pattern
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath === 'string') {
          checkImport(importPath, node, node.source);
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          const importPath = node.source.value;
          if (typeof importPath === 'string') {
            checkImport(importPath, node, node.source);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          const importPath = node.arguments[0].value;
          if (typeof importPath === 'string') {
            checkImport(importPath, node, node.arguments[0] as TSESTree.Literal);
          }
        }
      },
    };
  },
});
