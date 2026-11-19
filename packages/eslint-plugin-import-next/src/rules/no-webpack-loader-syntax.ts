/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-webpack-loader-syntax
 * Forbid webpack loader syntax in imports.
 *
 * `import css from 'style!css!./app.css'` configures webpack's loaders inside
 * the specifier. The module then only builds under webpack, and the loader
 * chain is hidden from the webpack config where it belongs.
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-webpack-loader-syntax.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'loaderSyntax';
type RuleOptions = [];

export const noWebpackLoaderSyntax = createRule<RuleOptions, MessageIds>({
  name: 'no-webpack-loader-syntax',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-webpack-loader-syntax.md',
      description: 'Forbid webpack loader syntax in imports',
    },
    messages: {
      loaderSyntax: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Webpack Loader Syntax',
        description: "Unexpected '!' in '{{name}}'",
        severity: 'MEDIUM',
        fix: 'Configure the loaders in the webpack config (module.rules) and import the plain path',
        documentationLink: 'https://webpack.js.org/concepts/loaders/#inline',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function check(
      source: TSESTree.Node | null | undefined,
      node: TSESTree.Node,
    ) {
      if (!source) return;
      const name = staticString(source);
      if (name === null || !name.includes('!')) return;
      context.report({ node, messageId: 'loaderSyntax', data: { name } });
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        check(node.source, node);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        check(node.source, node);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        check(node.source, node);
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        check(node.source, node);
      },
      // `import x = require('style!./a.css')` loads through the same chain.
      TSExternalModuleReference(node: TSESTree.TSExternalModuleReference) {
        check(node.expression, node);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          check(node.arguments[0], node);
        }
      },
    };
  },
});
