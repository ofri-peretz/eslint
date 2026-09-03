/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-named-as-default
 * Forbid use of exported name as identifier of default export
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'namedAsDefault';

type RuleOptions = [];

/** An import name is an Identifier, or a string literal for an unspellable name. */
const nameOf = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
  node.type === 'Identifier' ? node.name : node.value;

export const noNamedAsDefault = createRule<RuleOptions, MessageIds>({
  name: 'no-named-as-default',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-named-as-default.md',
      description:
        'Forbid use of exported name as identifier of default export',
      cwe: 'CWE-1078',
      cvss: 5,
    },
    messages: {
      namedAsDefault: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Named as Default',
        cwe: 'CWE-1078',
        description:
          'Using exported name "{{name}}" as default import may shadow the named export',
        severity: 'MEDIUM',
        fix: 'Use a different name for the default import or import the named export instead',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-as-default.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * The collision this rule can actually see is WITHIN one declaration: a
     * module's default is bound to a name, and the same declaration also
     * imports a named export spelled the same way. Deciding the general case —
     * "is `foo` a named export of './module'" — needs to resolve and read the
     * other module, which a type-unaware rule does not do.
     *
     * An earlier version also walked every `export` in the importing file into
     * two collections and then read neither: `Program:exit` held an `if` with
     * an empty body. It looked like same-file detection and was forty lines of
     * nothing, so the TN cases around exports passed because the rule had no
     * opinion rather than because it had the right one.
     */
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const named: TSESTree.ImportSpecifier[] = [];
        let defaultName: string | null = null;

        for (const spec of node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier') {
            defaultName = spec.local.name;
            continue;
          }
          if (spec.type !== 'ImportSpecifier') continue;
          // `import { default as foo }` binds the default export exactly as
          // `import foo` does — it is the spelling required when the same
          // declaration also needs `type` or a string-literal name, and it is
          // the one TypeScript emits under `esModuleInterop: false`. Reading
          // only ImportDefaultSpecifier missed every one of them.
          if (nameOf(spec.imported) === 'default') {
            defaultName = spec.local.name;
            continue;
          }
          named.push(spec);
        }

        if (defaultName === null) return;
        const collision = named.find(
          (spec) => nameOf(spec.imported) === defaultName,
        );
        if (collision === undefined) return;

        context.report({
          node: collision,
          messageId: 'namedAsDefault',
          data: { name: defaultName },
        });
      },
    };
  },
});
