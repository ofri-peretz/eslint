/**
 * ESLint Rule: consistent-type-specifier-style
 * Enforce or ban the use of inline type-only markers for named imports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/consistent-type-specifier-style.md
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  TSESLint,
} from '@interlace/eslint-devkit';

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

    /**
     * Get the text for a specifier, handling aliasing
     */
    function getSpecifierText(spec: TSESTree.ImportSpecifier): string {
      const imported =
        spec.imported.type === 'Identifier'
          ? spec.imported.name
          : spec.imported.value;
      const local = spec.local.name;

      if (imported === local) {
        return imported;
      }
      return `${imported} as ${local}`;
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const isTypeImport = node.importKind === 'type';

        if (style === 'prefer-inline') {
          // If using top-level type import with named specifiers, suggest inline
          if (isTypeImport && node.specifiers.length > 0) {
            const namedSpecifiers = node.specifiers.filter(
              (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier =>
                s.type === 'ImportSpecifier',
            );

            if (namedSpecifiers.length > 0) {
              context.report({
                node,
                messageId: 'preferInline',
                data: {
                  name: namedSpecifiers.map((s: TSESTree.ImportSpecifier) => s.local.name).join(', '),
                },
                fix(fixer: TSESLint.RuleFixer) {
                  // Build the new import statement using AST
                  // Convert: import type { Foo, Bar } from 'x'
                  // To: import { type Foo, type Bar } from 'x'

                  const specifiersText = namedSpecifiers
                    .map((spec: TSESTree.ImportSpecifier) => `type ${getSpecifierText(spec)}`)
                    .join(', ');

                  const sourceText = sourceCode.getText(node.source);
                  const newImport = `import { ${specifiersText} } from ${sourceText};`;

                  return fixer.replaceText(node, newImport);
                },
              });
            }
          }
        } else {
          // prefer-top-level
          // Check for inline type specifiers
          const namedSpecifiers = node.specifiers.filter(
            (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => s.type === 'ImportSpecifier',
          );

          const inlineTypeSpecifiers = namedSpecifiers.filter(
            (s: TSESTree.ImportSpecifier) => s.importKind === 'type',
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
                name: namedSpecifiers.map((s: TSESTree.ImportSpecifier) => s.local.name).join(', '),
              },
              fix(fixer: TSESLint.RuleFixer) {
                // Build the new import statement using AST
                // Convert: import { type Foo, type Bar } from 'x'
                // To: import type { Foo, Bar } from 'x'

                const specifiersText = namedSpecifiers
                  .map((spec: TSESTree.ImportSpecifier) => getSpecifierText(spec))
                  .join(', ');

                const sourceText = sourceCode.getText(node.source);
                const newImport = `import type { ${specifiersText} } from ${sourceText};`;

                return fixer.replaceText(node, newImport);
              },
            });
          }
        }
      },
    };
  },
});
