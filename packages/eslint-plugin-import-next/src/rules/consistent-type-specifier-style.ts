/**
 * ESLint Rule: consistent-type-specifier-style
 * Enforce or ban the use of inline type-only markers for named imports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/consistent-type-specifier-style.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferInline' | 'preferTopLevel';

type Style = 'prefer-inline' | 'prefer-top-level';

type RuleOptions = [Style?];

export const consistentTypeSpecifierStyle = createRule<RuleOptions, MessageIds>({
  name: 'consistent-type-specifier-style',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce or ban the use of inline type-only markers for named imports',
    },
    fixable: 'code',
    messages: {
      preferInline: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Type Import Style',
        cwe: 'CWE-1078',
        description: 'Use inline type specifier: import { type Foo }',
        severity: 'LOW',
        fix: 'Convert to inline type: import { type {{name}} } from ...',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/consistent-type-specifier-style.md',
      }),
      preferTopLevel: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Type Import Style',
        cwe: 'CWE-1078',
        description: 'Use top-level type import: import type { Foo }',
        severity: 'LOW',
        fix: 'Convert to top-level type: import type { {{name}} } from ...',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/consistent-type-specifier-style.md',
      }),
    },
    schema: [
      {
        type: 'string',
        enum: ['prefer-inline', 'prefer-top-level'],
        default: 'prefer-inline',
      },
    ],
  },
  defaultOptions: ['prefer-inline'],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const style = context.options[0] || 'prefer-inline';
    const sourceCode = context.getSourceCode();

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const isTypeImport = node.importKind === 'type';

        if (style === 'prefer-inline') {
          // If using top-level type import with named specifiers, suggest inline
          if (isTypeImport && node.specifiers.length > 0) {
            const namedSpecifiers = node.specifiers.filter(
              (s) => s.type === 'ImportSpecifier',
            ) as TSESTree.ImportSpecifier[];

            if (namedSpecifiers.length > 0) {
              context.report({
                node,
                messageId: 'preferInline',
                data: {
                  name: namedSpecifiers
                    .map((s) => s.local.name)
                    .join(', '),
                },
                fix(fixer) {
                  // Convert: import type { Foo, Bar } from 'x'
                  // To: import { type Foo, type Bar } from 'x'
                  const importText = sourceCode.getText(node);
                  const fixed = importText
                    .replace(/^import\s+type\s*\{/, 'import {')
                    .replace(/\{([^}]+)\}/, (match, inner: string) => {
                      const parts = inner.split(',').map((part) => {
                        const trimmed = part.trim();
                        if (trimmed && !trimmed.startsWith('type ')) {
                          return ' type ' + trimmed;
                        }
                        return part;
                      });
                      return '{' + parts.join(',') + '}';
                    });
                  return fixer.replaceText(node, fixed);
                },
              });
            }
          }
        } else {
          // prefer-top-level
          // Check for inline type specifiers
          const namedSpecifiers = node.specifiers.filter(
            (s) => s.type === 'ImportSpecifier',
          ) as TSESTree.ImportSpecifier[];

          const inlineTypeSpecifiers = namedSpecifiers.filter(
            (s) => s.importKind === 'type',
          );

          // If all named imports are type imports, suggest top-level
          if (
            !isTypeImport &&
            namedSpecifiers.length > 0 &&
            inlineTypeSpecifiers.length === namedSpecifiers.length
          ) {
            context.report({
              node,
              messageId: 'preferTopLevel',
              data: {
                name: namedSpecifiers
                  .map((s) => s.local.name)
                  .join(', '),
              },
              fix(fixer) {
                // Convert: import { type Foo, type Bar } from 'x'
                // To: import type { Foo, Bar } from 'x'
                const importText = sourceCode.getText(node);
                const fixed = importText
                  .replace(/^import\s*\{/, 'import type {')
                  .replace(/\{\s*type\s+/g, '{ ')
                  .replace(/,\s*type\s+/g, ', ');
                return fixer.replaceText(node, fixed);
              },
            });
          }
        }
      },
    };
  },
});
