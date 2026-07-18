/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-dynamic-require
 * Forbid `require()` calls with expressions (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'dynamicRequire';

export interface Options {
  /** Allow dynamic requires in specific contexts */
  allowContexts?: ('test' | 'config' | 'build' | 'runtime')[];
  /** Allow specific patterns of dynamic requires */
  allowPatterns?: string[];
}

type RuleOptions = [Options?];

export const noDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-require',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-require.md',
      description:
        'Forbid `require()` calls with expressions',
      cwe: 'CWE-94',
      cweJustification: 'CWE-94 (Improper Control of Generation of Code) — dynamic require with attacker-influenced path can load arbitrary modules, equivalent to remote code execution.',
      confidence: 'high',
    },
    hasSuggestions: false,
    messages: {
      dynamicRequire: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Dynamic Require',
        description: 'Require call uses dynamic expression',
        severity: 'HIGH',
        fix: 'Use static string literals for require() calls',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-dynamic-require.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowContexts: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['test', 'config', 'build', 'runtime'],
            },
            description: 'Allow dynamic requires in specific contexts.',
          },
          allowPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Regex patterns for allowed dynamic require paths.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allowContexts: [],
    allowPatterns: []
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allowContexts = [],
    } = options || {};

    const filename = context.filename || '';

    function isInAllowedContext(): boolean {
      if (allowContexts.includes('test') && (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('/__tests__/'))) {
        return true;
      }

      if (allowContexts.includes('config') && (filename.includes('config') || filename.includes('webpack') || filename.includes('rollup'))) {
        return true;
      }

      if (allowContexts.includes('build') && (filename.includes('build') || filename.includes('scripts') || filename.includes('tools'))) {
        return true;
      }

      if (allowContexts.includes('runtime') && (filename.includes('runtime') || filename.includes('dynamic'))) {
        return true;
      }

      return false;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isStaticLiteral(node: TSESTree.Node): boolean {
      return node.type === 'Literal' && typeof node.value === 'string';
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const requireArg = node.arguments[0];

          if (isInAllowedContext()) {
            return;
          }

          // Check if it's a static literal
          if (isStaticLiteral(requireArg)) {
            // Static requires are allowed
            return;
          }

          // Report dynamic require
          context.report({
            node: requireArg,
            messageId: 'dynamicRequire',
          });
        }
      },
    };
  },
});
