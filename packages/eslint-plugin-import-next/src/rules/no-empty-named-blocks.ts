/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-empty-named-blocks
 * Forbid empty named import blocks
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-empty-named-blocks.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'emptyNamedBlock' | 'suggestRemove';

type RuleOptions = [];

export const noEmptyNamedBlocks = createRule<RuleOptions, MessageIds>({
  name: 'no-empty-named-blocks',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-empty-named-blocks',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-empty-named-blocks.md',
      description: 'Forbid empty named import blocks',
      cwe: 'CWE-561',
      cvss: 2.5,
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      emptyNamedBlock: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Empty Named Import',
        cwe: 'CWE-561',
        description: 'Empty named import block serves no purpose',
        severity: 'LOW',
        fix: 'Remove the empty import or add named imports',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-empty-named-blocks.md',
      }),
      suggestRemove: 'Remove empty import statement',
    },
    schema: [],
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // `import {} from 'm'` and `export {} from 'm'` still load and run `m`, so
    // deleting the statement silently drops its side effects (a polyfill, a
    // stylesheet, a registration). The safe fix keeps the load: `import 'm'`,
    // with any import attributes and the semicolon carried over. A type-only
    // statement loads nothing, so removing it is safe. Removing a value
    // statement entirely stays available as a suggestion: an explicit choice.
    const keepSideEffect = (
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      source: TSESTree.StringLiteral,
    ) => {
      const typeOnly =
        node.type === 'ImportDeclaration'
          ? node.importKind === 'type'
          : node.exportKind === 'type';
      return (fixer: TSESLint.RuleFixer) =>
        typeOnly
          ? fixer.remove(node)
          : fixer.replaceText(
              node,
              `import ${context.sourceCode.text.slice(source.range[0], node.range[1])}`,
            );
    };
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Check if this import has empty named imports: import {} from 'foo'
        // or import Foo, {} from 'foo'
        const hasDefaultImport = node.specifiers.some(
          (spec: TSESTree.ImportClause) =>
            spec.type === 'ImportDefaultSpecifier',
        );
        const namedImports = node.specifiers.filter(
          (spec: TSESTree.ImportClause) => spec.type === 'ImportSpecifier',
        );

        // An empty block is a `{` token with no specifier in it. Read tokens,
        // not text: a comment inside the braces leaves them empty, and a `{}`
        // inside a comment is no block. Only tokens before the source count
        // (import attributes `with { ... }` come after it).
        const sourceCode = context.sourceCode;
        const tokens = sourceCode.getTokens(node);
        const braceIndex = tokens.findIndex(
          (t) => t.value === '{' && t.range[1] <= node.source.range[0],
        );
        const openBrace = braceIndex === -1 ? undefined : tokens[braceIndex];

        if (openBrace && namedImports.length === 0) {
          // Braces with no specifier in them sit alone or after a default
          // binding (`import * as ns, {}` is not valid syntax).
          if (!hasDefaultImport) {
            context.report({
              node,
              messageId: 'emptyNamedBlock',
              fix: keepSideEffect(node, node.source),
              suggest: [
                {
                  messageId: 'suggestRemove',
                  fix(fixer: TSESLint.RuleFixer) {
                    return fixer.remove(node);
                  },
                },
              ],
            });
          } else {
            // Remove `, { ... }`: from the comma before the brace to the
            // closing brace, comments inside included.
            // The brace follows the default binding's comma; the closing brace
            // follows it, comments aside (tokens hold no comments).
            const comma = tokens[braceIndex - 1];
            const closeBrace = tokens[braceIndex + 1];
            const removeEmptyBlock = (fixer: TSESLint.RuleFixer) =>
              fixer.removeRange([comma.range[0], closeBrace.range[1]]);
            // Has default import with empty braces: import Foo, {} from 'bar'
            // Fix to: import Foo from 'bar'
            context.report({
              node,
              messageId: 'emptyNamedBlock',
              fix: removeEmptyBlock,
              suggest: [
                {
                  messageId: 'suggestRemove',
                  fix: removeEmptyBlock,
                },
              ],
            });
          }
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Check for: export {} from 'foo' or export {}
        if (
          node.specifiers.length === 0 &&
          !node.declaration &&
          node.source // Only for re-exports, local `export {}` is technically valid but useless
        ) {
          context.report({
            node,
            messageId: 'emptyNamedBlock',
            fix: keepSideEffect(node, node.source),
            suggest: [
              {
                messageId: 'suggestRemove',
                fix(fixer: TSESLint.RuleFixer) {
                  return fixer.remove(node);
                },
              },
            ],
          });
        }
      },
    };
  },
});
