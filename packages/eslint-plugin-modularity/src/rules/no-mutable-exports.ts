/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-mutable-exports
 * Disallow `export let` and `export var` — module exports should be immutable
 * constants so that importers share a stable reference.
 *
 * Mutable module-level exports (`let`/`var`) allow a module to silently change
 * the value seen by all importers. Importers get the _live binding_ and may
 * observe different values over time, which is almost always unintentional and
 * leads to subtle race-condition-like bugs.
 *
 * Correct patterns:
 *   export const FOO = 1;             // immutable primitive
 *   export function foo() { ... }    // function declaration (always immutable)
 *   export class Foo { ... }         // class declaration (always immutable)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noMutableExport';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Options {}

type RuleOptions = [Options?];

export const noMutableExports = createRule<RuleOptions, MessageIds>({
  name: 'no-mutable-exports',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modularity/docs/rules/no-mutable-exports.md',
      description: 'Disallow mutable exports (export let / export var)',
    },
    fixable: 'code',
    messages: {
      noMutableExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Mutable Export',
        description:
          'Exporting a `{{kind}}` binding creates a live, mutable reference visible to all importers. Use `const` instead.',
        severity: 'MEDIUM',
        fix: 'Change `export {{kind}}` to `export const`',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        const decl = node.declaration;
        if (!decl || decl.type !== 'VariableDeclaration') return;
        if (decl.kind !== 'let' && decl.kind !== 'var') return;

        context.report({
          node: decl,
          messageId: 'noMutableExport',
          data: { kind: decl.kind },
          fix(fixer: TSESLint.RuleFixer) {
            // Replace `let` or `var` keyword with `const`
            const sourceCode = context.sourceCode;
            const kindToken = sourceCode.getFirstToken(decl);
            if (!kindToken) return null;
            return fixer.replaceText(kindToken, 'const');
          },
        });
      },
    };
  },
});
