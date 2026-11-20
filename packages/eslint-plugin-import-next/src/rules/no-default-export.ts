/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-default-export
 * Prevents default exports (eslint-plugin-import inspired)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { matchesAnyFilePattern } from '../utils/file-patterns';

type MessageIds =
  'defaultExport' | 'preferNamedExport' | 'defaultExportRefactor';

export interface Options {
  /** Allow default exports in specific files */
  allowInFiles?: string[];
  /** Allow default exports for specific patterns */
  allowPatterns?: string[];
  /** Suggest named export alternative */
  suggestNamed?: boolean;
}

type RuleOptions = [Options?];

export const noDefaultExport = createRule<RuleOptions, MessageIds>({
  name: 'no-default-export',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-default-export',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-default-export.md',
      description: 'Prevents default exports',
    },
    fixable: 'code',
    messages: {
      defaultExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Default Export Detected',
        description: 'Default export violates import style guidelines',
        severity: 'MEDIUM',
        fix: 'Use named export instead of default export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-default-export.md',
      }),
      preferNamedExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Prefer Named Exports',
        description:
          'Named exports provide better tree-shaking and refactoring',
        severity: 'LOW',
        fix: 'Convert default export to named export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-default-export.md',
      }),
      defaultExportRefactor: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Export Style Violation',
        description: 'Default export pattern not allowed in this codebase',
        severity: 'MEDIUM',
        fix: 'Refactor to use named exports consistently',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-default-export.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow default exports in specific files.',
          },
          allowPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Allow default exports for specific patterns.',
          },
          suggestNamed: {
            type: 'boolean',
            default: true,
            description: 'Suggest named export alternative.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInFiles: [],
      allowPatterns: [],
      suggestNamed: true,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowInFiles: string[];
    let allowPatterns: string[];
    let suggestNamed: boolean;
    let filename: string;

    function shouldAllow(): boolean {
      return (
        !!filename &&
        (matchesAnyFilePattern(filename, allowInFiles) ||
          matchesAnyFilePattern(filename, allowPatterns))
      );
    }

    function generateNamedExportSuggestion(
      node: TSESTree.ExportDefaultDeclaration,
    ): string {
      if (!suggestNamed) {
        return '';
      }

      const declaration = node.declaration;

      // Try to determine a good name for the named export
      let suggestedName = 'exportedValue';

      if (declaration.type === 'Identifier') {
        // export default foo; -> export { foo };
        suggestedName = declaration.name;
      } else if (declaration.type === 'FunctionDeclaration' && declaration.id) {
        // export default function foo() {} -> export function foo() {}
        // But we still need to report this as it should be export function foo()
        suggestedName = declaration.id.name;
      } else if (declaration.type === 'ClassDeclaration' && declaration.id) {
        // export default class Foo {} -> export class Foo {}
        suggestedName = declaration.id.name;
      } else if (
        declaration.type === 'FunctionDeclaration' &&
        !declaration.id
      ) {
        // export default function() {} -> export function defaultFunction() {}
        suggestedName = 'defaultFunction';
      } else if (declaration.type === 'ClassDeclaration' && !declaration.id) {
        // export default class {} -> export class DefaultClass {}
        suggestedName = 'DefaultClass';
      }

      return `// Convert to: export { ${suggestedName} };`;
    }

    const sourceCodeOf = (): Readonly<TSESLint.SourceCode> =>
      context.sourceCode;

    /**
     * Every name this module already declares or publishes, plus every global
     * it reads. A name outside this set can be introduced at module scope
     * without capturing a reference or clashing with a declaration or an
     * export.
     */
    function takenNames(node: TSESTree.ExportDefaultDeclaration): Set<string> {
      const sourceCode = sourceCodeOf();
      const taken = new Set<string>();
      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
        scope;
        scope = scope.upper
      ) {
        for (const variable of scope.variables) taken.add(variable.name);
        // A name the code reads but nobody declares is a global; a binding of
        // the same name would capture it.
        for (const reference of scope.through) {
          taken.add(reference.identifier.name);
        }
      }
      for (const name of publishedNames()) taken.add(name);
      return taken;
    }

    /** The names this module already exports (`export default` excluded). */
    function publishedNames(): Set<string> {
      const sourceCode = sourceCodeOf();
      const names = new Set<string>();
      for (const statement of sourceCode.ast.body) {
        if (statement.type === 'ExportAllDeclaration' && statement.exported) {
          names.add(nameOf(statement.exported));
        } else if (statement.type === 'ExportNamedDeclaration') {
          for (const specifier of statement.specifiers) {
            names.add(nameOf(specifier.exported));
          }
          if (statement.declaration) {
            for (const variable of sourceCode.getDeclaredVariables(
              statement.declaration,
            )) {
              names.add(variable.name);
            }
          }
        }
      }
      return names;
    }

    function nameOf(
      node: TSESTree.Identifier | TSESTree.StringLiteral,
    ): string {
      return node.type === 'Identifier' ? node.name : node.value;
    }

    /** `base`, or `base2`, `base3`, … — the first name nothing already uses. */
    function freshName(
      base: string,
      node: TSESTree.ExportDefaultDeclaration,
    ): string {
      const taken = takenNames(node);
      let name = base;
      for (let n = 2; taken.has(name); n++) name = `${base}${n}`;
      return name;
    }

    /**
     * The rewrite, or `null` where there is no safe one.
     *
     * Only three shapes keep the module's meaning under a plain rename:
     *
     * - `export default foo;` becomes `export { foo };`;
     * - `export default function foo() {}`, `class Foo {}` and
     *   `interface Foo {}` lose the word `default`;
     * - any other EXPRESSION is bound to a fresh name and exported by it.
     *
     * An anonymous function or class declaration is given a fresh name where it
     * stands. Every other declaration form (an overload signature, a decorated
     * anonymous class) is reported without a fix: the old code stripped
     * `default` from all of them and wrote `export function () {}` and
     * `export { port: 3000 } satisfies T` to disk (#1540).
     */
    function buildFix(
      node: TSESTree.ExportDefaultDeclaration,
      fixer: TSESLint.RuleFixer,
    ): TSESLint.RuleFix | TSESLint.RuleFix[] | null {
      const sourceCode = sourceCodeOf();
      const declaration = node.declaration;
      const defaultToken = sourceCode.getFirstToken(node, { skip: 1 })!;
      const published = publishedNames();

      /** `export default` becomes `export`; the declaration stays as written. */
      const dropDefault = fixer.replaceTextRange(
        [node.range[0], defaultToken.range[1]],
        'export',
      );

      if (declaration.type === 'Identifier') {
        // `export { foo }` would publish a name the module already publishes.
        if (published.has(declaration.name)) return null;
        return fixer.replaceText(node, `export { ${declaration.name} };`);
      }

      if (
        declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ClassDeclaration' ||
        declaration.type === 'TSInterfaceDeclaration'
      ) {
        if (declaration.id) {
          return published.has(declaration.id.name) ? null : dropDefault;
        }
        // Anonymous, so a function or a class (an interface always has a
        // name). A decorator sits outside the span the rewrite reads.
        if (
          declaration.type === 'ClassDeclaration' &&
          declaration.decorators.length > 0
        ) {
          return null;
        }
        const isClass = declaration.type === 'ClassDeclaration';
        let keyword = sourceCode.getFirstToken(declaration)!;
        while (keyword.value !== (isClass ? 'class' : 'function')) {
          keyword = sourceCode.getTokenAfter(keyword)!;
        }
        const star = isClass ? null : sourceCode.getTokenAfter(keyword);
        const after = star?.value === '*' ? star : keyword;
        const name = freshName(
          isClass ? 'DefaultClass' : 'defaultFunction',
          node,
        );
        return [dropDefault, fixer.insertTextAfter(after, ` ${name}`)];
      }

      // An overload signature has no body to name or expression to bind: no fix.
      if (declaration.type === 'TSDeclareFunction') return null;

      // An expression. Its text is read from `default` onward, not
      // from the node: a parenthesised `(a, b)` loses its parentheses in the
      // node's range, and `const x = a, b;` is not what it said.
      let last = sourceCode.getLastToken(node)!;
      if (last.value === ';' && last.range[0] >= declaration.range[1]) {
        last = sourceCode.getTokenBefore(last)!;
      }
      const text = sourceCode.text
        .slice(defaultToken.range[1], last.range[1])
        .trim();
      const name = freshName('defaultExport', node);
      return fixer.replaceText(
        node,
        `const ${name} = ${text};\nexport { ${name} };`,
      );
    }

    return {
      before() {
        const [options] = context.options;
        ({
          allowInFiles = [],
          allowPatterns = [],
          suggestNamed = true,
        } = options || {});

        filename = context.filename;
      },
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        if (shouldAllow()) {
          return;
        }

        const suggestion = generateNamedExportSuggestion(node);

        context.report({
          node,
          messageId: 'defaultExport',
          data: {
            currentFile: filename,
            suggestion: 'Use named export for better tree-shaking',
            example: suggestion,
          },
          fix(fixer: TSESLint.RuleFixer) {
            return buildFix(node, fixer);
          },
        });
      },

      // Also check for export { default } patterns
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (shouldAllow()) {
          return;
        }

        // Check if this is export { default } from "module"
        // This is a re-export pattern that effectively creates a default export
        if (node.specifiers) {
          // What matters is the name this module PUBLISHES. `export { default
          // as Foo } from 'm'` takes another module's default and publishes it
          // under a name: that is the named export this rule asks for.
          const hasDefaultSpecifier = node.specifiers.some(
            (spec: TSESTree.ExportSpecifier) =>
              (spec.exported.type === 'Identifier'
                ? spec.exported.name
                : spec.exported.value) === 'default',
          );
          if (hasDefaultSpecifier) {
            context.report({
              node,
              messageId: 'preferNamedExport',
              data: {
                pattern: 'export { default }',
                currentFile: filename,
                suggestion: 'Use named re-export instead',
              },
            });
          }
        }
      },

      // `export * as default from 'm'` publishes the namespace as the default.
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (shouldAllow()) {
          return;
        }
        // Typed as an Identifier, but `export * as "default"` parses as a
        // string Literal.
        const exported = node.exported as TSESTree.Node | null;
        const name =
          exported?.type === 'Identifier'
            ? exported.name
            : exported?.type === 'Literal'
              ? exported.value
              : undefined;
        if (name === 'default') {
          context.report({
            node,
            messageId: 'preferNamedExport',
            data: {
              pattern: 'export * as default',
              currentFile: filename,
              suggestion: 'Use a named namespace re-export instead',
            },
          });
        }
      },

      // Check for export = value (TypeScript namespace export)
      TSExportAssignment(node: TSESTree.TSExportAssignment) {
        if (shouldAllow()) {
          return;
        }

        context.report({
          node,
          messageId: 'defaultExportRefactor',
          data: {
            pattern: 'export = value',
            currentFile: filename,
            suggestion: 'Use ES6 named exports',
          },
        });
      },

      // Handle TypeScript interface and type exports
      TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration) {
        // Check if this is a default export (export default interface ...)
        // This would be caught by ExportDefaultDeclaration, but we need to handle
        // the case where it's directly exported as default
        if (node.parent && node.parent.type === 'ExportDefaultDeclaration') {
          // This will be handled by ExportDefaultDeclaration visitor
          return;
        }
      },

      TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration) {
        // Similar to interfaces
        if (
          node.parent &&
          node.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration
        ) {
          return;
        }
      },
    };
  },
});
