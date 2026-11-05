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
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';

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

/**
 * webpack's chunk name characters, plus its `[request]` and `[index]`
 * placeholders (`webpackChunkName: "[request]"` names each chunk after the
 * module it loads).
 */
const DEFAULT_FORMAT = '([0-9a-zA-Z-_/.]|\\[(request|index)\\])+';

export const dynamicImportChunkname = createRule<RuleOptions, MessageIds>({
  name: 'dynamic-import-chunkname',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/dynamic-import-chunkname.md',
      description:
        'Enforce a leading comment with the webpackChunkName for dynamic imports',
      cwe: 'CWE-1078',
      cvss: 2.5,
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
      webpackChunknameFormat: DEFAULT_FORMAT,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowEmpty: boolean;
    let importFunctions: string[];
    let webpackChunknameFormat: string;
    let chunkNamePattern: RegExp;
    let sourceCode: Readonly<TSESLint.SourceCode>;

    function checkChunkName(
      node: TSESTree.ImportExpression | TSESTree.CallExpression,
      source: TSESTree.Node,
    ) {
      // The magic comments sit inside the call, before the module argument.
      const comments = sourceCode.getCommentsBefore(source);

      // `webpackMode: "eager"` keeps the module in the parent chunk: there
      // is no chunk to name.
      if (comments.some((c) => /webpackMode:\s*["']eager["']/.test(c.value))) {
        return;
      }

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
                  const staticText = staticString(source);
                  if (staticText !== null) {
                    const chunkName =
                      staticText
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
      before() {
        const options = context.options[0] || {};
        ({
          allowEmpty = false,
          importFunctions = [],
          webpackChunknameFormat = DEFAULT_FORMAT,
        } = options);
        chunkNamePattern = new RegExp(`^${webpackChunknameFormat}$`);
        sourceCode = context.sourceCode;
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        checkChunkName(node, node.source);
      },
      // `importFunctions`: calls the user declares to be dynamic imports.
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          importFunctions.includes(node.callee.name) &&
          node.arguments.length > 0
        ) {
          checkChunkName(node, node.arguments[0]);
        }
      },
    };
  },
});
