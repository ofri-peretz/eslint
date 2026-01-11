/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: dynamic-import-chunkname
 * Enforce a leading comment with the webpackChunkName for dynamic imports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/dynamic-import-chunkname.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingChunkName' | 'invalidChunkName' | 'suggestChunkName';

export interface Options {
  /** Import functions to check (defaults to just dynamic import) */
  importFunctions?: string[];
  /** Allowed prefixes for chunk names */
  allowEmpty?: boolean;
  /** Pattern to validate chunk name (regex string) */
  webpackChunknameFormat?: string;
}

type RuleOptions = [Options?];

export const dynamicImportChunkname = createRule<RuleOptions, MessageIds>({
  name: 'dynamic-import-chunkname',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce a leading comment with the webpackChunkName for dynamic imports',
    },
    hasSuggestions: true,
    messages: {
      missingChunkName: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Chunk Name',
        cwe: 'CWE-1078',
        description: 'Dynamic import is missing webpackChunkName comment',
        severity: 'LOW',
        fix: 'Add /* webpackChunkName: "chunk-name" */ before the import path',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/dynamic-import-chunkname.md',
      }),
      invalidChunkName: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Invalid Chunk Name',
        cwe: 'CWE-1078',
        description: 'webpackChunkName "{{chunkName}}" does not match pattern',
        severity: 'LOW',
        fix: 'Update chunk name to match the required pattern',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/dynamic-import-chunkname.md',
      }),
      suggestChunkName: 'Add webpackChunkName comment',
    },
    schema: [
      {
        type: 'object',
        properties: {
          importFunctions: {
            type: 'array',
            items: { type: 'string' },
          },
          allowEmpty: { type: 'boolean', default: false },
          webpackChunknameFormat: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      importFunctions: [],
      allowEmpty: false,
      webpackChunknameFormat: '[a-zA-Z0-9-_/.]+',
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { allowEmpty = false, webpackChunknameFormat = '[a-zA-Z0-9-_/.]+' } =
      options;
    const chunkNamePattern = new RegExp(`^${webpackChunknameFormat}$`);
    const sourceCode = context.getSourceCode();

    function checkChunkName(node: TSESTree.ImportExpression) {
      // Get leading comments
      const comments = sourceCode.getCommentsBefore(node.source);

      // Look for webpackChunkName in comments
      let foundChunkName: string | null = null;
      let hasWebpackComment = false;

      for (const comment of comments) {
        const text = comment.value.trim();
        const match = text.match(/webpackChunkName:\s*["']([^"']+)["']/);
        if (match) {
          hasWebpackComment = true;
          foundChunkName = match[1];
          break;
        }
      }

      if (!hasWebpackComment) {
        if (!allowEmpty) {
          context.report({
            node,
            messageId: 'missingChunkName',
            suggest: [
              {
                messageId: 'suggestChunkName',
                fix(fixer: TSESLint.RuleFixer) {
                  // Generate a chunk name from the import path
                  const source = node.source;
                  if (source.type === 'Literal' && typeof source.value === 'string') {
                    const chunkName = source.value
                      .split('/')
                      .pop()
                      ?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'chunk';
                    return fixer.insertTextBefore(
                      source,
                      `/* webpackChunkName: "${chunkName}" */ `,
                    );
                  }
                  return null;
                },
              },
            ],
          });
        }
      } else if (foundChunkName && !chunkNamePattern.test(foundChunkName)) {
        context.report({
          node,
          messageId: 'invalidChunkName',
          data: { chunkName: foundChunkName },
        });
      }
    }

    return {
      ImportExpression(node: TSESTree.ImportExpression) {
        checkChunkName(node);
      },
    };
  },
});
