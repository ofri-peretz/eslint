/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import path from 'node:path';

type MessageIds = 'missingExtension' | 'unexpectedExtension';
type Options = [
  {
    pattern?: Record<string, 'always' | 'never'>;
    default?: 'always' | 'never';
  },
];

type RuleOptions = Options;

export const extensions = createRule<Options, MessageIds>({
  name: 'extensions',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure consistent use of file extensions in imports',
    },
    fixable: 'code',
    messages: {
      missingExtension: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Extension',
        description: 'Missing file extension in import',
        severity: 'MEDIUM',
        fix: 'Add the file extension (e.g., .js, .ts)',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/extensions.md',
      }),
      unexpectedExtension: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Unexpected Extension',
        description: 'Unexpected file extension in import',
        severity: 'MEDIUM',
        fix: 'Remove the file extension',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/extensions.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'object',
            additionalProperties: { type: 'string', enum: ['always', 'never'] },
          },
          default: { type: 'string', enum: ['always', 'never'] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      default: 'never',
      pattern: {
        js: 'never',
        ts: 'never',
        tsx: 'never',
        jsx: 'never',
        json: 'always',
        css: 'always',
        scss: 'always',
        svg: 'always',
        png: 'always',
        jpg: 'always',
      },
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {} as Options[0]] = context.options;
    const defaultBehavior = options.default ?? 'never';
    const pattern: Record<string, 'always' | 'never'> = options.pattern ?? {
      js: 'never',
      ts: 'never',
      tsx: 'never',
      jsx: 'never',
      json: 'always',
      css: 'always',
      scss: 'always',
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value;
        if (!source.startsWith('.')) return; // Only check relative imports

        const ext = path.extname(source).slice(1); // remove dot
        const expected = pattern[ext] || defaultBehavior;

        if (ext && expected === 'never') {
          context.report({
            node: node.source,
            messageId: 'unexpectedExtension',
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(
                node.source,
                `'${source.slice(0, -ext.length - 1)}'`,
              );
            },
          });
        } else if (!ext) {
          // Hard to know what the extension *should* be without checking file system
          // But if default is 'always', we might flag it.
          // For now, let's assume if it's missing and we expect 'always', it's a problem.
          if (defaultBehavior === 'always') {
            context.report({
              node: node.source,
              messageId: 'missingExtension',
              // Can't fix without knowing extension
            });
          }
        }
      },
    };
  },
});
