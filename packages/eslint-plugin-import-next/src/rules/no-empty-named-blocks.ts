/**
 * ESLint Rule: no-empty-named-blocks
 * Forbid empty named import blocks
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-empty-named-blocks.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'emptyNamedBlock' | 'suggestRemove';

type RuleOptions = [];

export const noEmptyNamedBlocks = createRule<RuleOptions, MessageIds>({
  name: 'no-empty-named-blocks',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid empty named import blocks',
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

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Check if this import has empty named imports: import {} from 'foo'
        // or import Foo, {} from 'foo'
        const hasDefaultImport = node.specifiers.some(
          (spec: TSESTree.ImportClause) => spec.type === 'ImportDefaultSpecifier',
        );
        const hasNamespaceImport = node.specifiers.some(
          (spec: TSESTree.ImportClause) => spec.type === 'ImportNamespaceSpecifier',
        );
        const namedImports = node.specifiers.filter(
          (spec: TSESTree.ImportClause) => spec.type === 'ImportSpecifier',
        );

        // Get the source code
        const sourceCode = context.getSourceCode();
        const importText = sourceCode.getText(node);

        // Check for empty braces pattern: {}
        const hasEmptyBraces = /\{\s*\}/.test(importText);

        if (hasEmptyBraces && namedImports.length === 0) {
          // If there's only empty braces (no default, no namespace)
          if (!hasDefaultImport && !hasNamespaceImport) {
            context.report({
              node,
              messageId: 'emptyNamedBlock',
              fix(fixer: TSESLint.RuleFixer) {
                // Remove the entire import statement
                return fixer.remove(node);
              },
              suggest: [
                {
                  messageId: 'suggestRemove',
                  fix(fixer: TSESLint.RuleFixer) {
                    return fixer.remove(node);
                  },
                },
              ],
            });
          } else if (hasDefaultImport) {
            // Has default import with empty braces: import Foo, {} from 'bar'
            // Fix to: import Foo from 'bar'
            context.report({
              node,
              messageId: 'emptyNamedBlock',
              fix(fixer: TSESLint.RuleFixer) {
                // Remove the ", {}" part
                const fixedText = importText.replace(/,\s*\{\s*\}/, '');
                return fixer.replaceText(node, fixedText);
              },
              suggest: [
                {
                  messageId: 'suggestRemove',
                  fix(fixer: TSESLint.RuleFixer) {
                    const fixedText = importText.replace(/,\s*\{\s*\}/, '');
                    return fixer.replaceText(node, fixedText);
                  },
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
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.remove(node);
            },
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
