/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  resolveModule,
} from '@interlace/eslint-devkit';

type MessageIds = 'noDuplicates';

export interface Options {
  additionalModules?: string[];
  /**
   * eslint-plugin-import: whether a query string names a different module.
   * Absent or `true`, this rule's own reading: `./m?raw` and `./m?url` are
   * two modules, while `./m?raw` and `./m.ts?raw` are one. `false`
   * (eslint-plugin-import's default) ignores the query: `./m?raw`,
   * `./m?url` and `./m` are one module.
   */
  considerQueryString?: boolean;
  /**
   * eslint-plugin-import: `import type { T }` beside a value import of the
   * same module is a duplicate, merged as an inline `type` specifier
   * (`import { v, type T }`).
   */
  'prefer-inline'?: boolean;
}

export type RuleOptions = [Options?];

/**
 * The `declare module 'x' {}` an import sits in, or the file itself. Imports
 * in two ambient module blocks of a `.d.ts` belong to two modules.
 */
function enclosingModule(node: TSESTree.Node): TSESTree.Node | null {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'TSModuleDeclaration') return p;
  }
  return null;
}

const hasNamespace = (d: TSESTree.ImportDeclaration) =>
  d.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier');
const hasNamed = (d: TSESTree.ImportDeclaration) =>
  d.specifiers.some((s) => s.type === 'ImportSpecifier');

const hasDefault = (d: TSESTree.ImportDeclaration) =>
  d.specifiers.some((s) => s.type === 'ImportDefaultSpecifier');

/**
 * `import * as ns` beside `import { a }` of one module cannot be one
 * statement (`import * as ns, { a }` is not valid syntax), and neither adds
 * nothing to the other: not a duplicate. Nor can a type-only default beside
 * a type-only named or namespace import: TypeScript rejects
 * `import type D, { A }` (TS1363). Every other pair of value imports (or of
 * `import type` statements) can be merged or is redundant.
 */
const unmergeable = (
  a: TSESTree.ImportDeclaration,
  b: TSESTree.ImportDeclaration,
) =>
  (hasNamespace(a) && hasNamed(b)) ||
  (hasNamespace(b) && hasNamed(a)) ||
  (a.importKind === 'type' &&
    b.importKind === 'type' &&
    hasDefault(a) !== hasDefault(b));

export const noDuplicates = createRule<RuleOptions, MessageIds>({
  name: 'no-duplicates',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-duplicates',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-duplicates.md',
      description: 'Reports duplicate imports',
    },
    fixable: 'code',
    messages: {
      noDuplicates: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Duplicate Import',
        description: 'Duplicate import from the same module',
        severity: 'HIGH',
        fix: 'Merge imports into a single statement',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-duplicates.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          considerQueryString: {
            type: 'boolean',
            description:
              'Whether a query string names a different module. Absent or true: it does. false: the query is ignored.',
          },
          'prefer-inline': {
            type: 'boolean',
            description:
              '`import type` beside a value import of the same module is a duplicate, merged as an inline `type` specifier.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let imports: Map<string, TSESTree.ImportDeclaration[]>;
    let scopes: Map<TSESTree.Node | null, number>;
    let ignoreQuery: boolean;
    let preferInline: boolean;

    return {
      before() {
        imports = new Map<string, TSESTree.ImportDeclaration[]>();
        scopes = new Map<TSESTree.Node | null, number>();
        const [options] = context.options;
        ignoreQuery = options?.considerQueryString === false;
        preferInline = options?.['prefer-inline'] === true;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Keyed by source AND importKind. `import type { T } from 'm'` beside
        // `import { v } from 'm'` is not a duplicate: the type-only form is
        // erased at compile time, so folding it into the value import creates a
        // runtime dependency that was not there and defeats
        // `verbatimModuleSyntax` and tree-shaking. 42 of the 94 findings on the
        // pinned corpus — 45% — were this shape. ESLint core's
        // `import/no-duplicates` separates them the same way.
        //
        // The module is the file the resolver sees: './m' and './m.js' (for
        // m.ts) and './m/index' are one module. A relative specifier that does
        // not resolve, or carries a query ('./m?raw'), keeps its own spelling.
        //
        // `prefer-inline` puts `import type` and value imports of one module
        // in one group: the merge keeps the type-only names type-only, as
        // inline `type` specifiers, so nothing new is emitted.
        //
        // `considerQueryString: false` drops the query before any of that.
        const written = node.source.value;
        const spec = ignoreQuery ? written.replace(/\?.*$/, '') : written;
        const target = spec.startsWith('.')
          ? (resolveModule(spec, context.filename) ?? spec)
          : spec;
        const owner = enclosingModule(node);
        let scopeId = scopes.get(owner);
        if (scopeId === undefined) {
          scopeId = scopes.size;
          scopes.set(owner, scopeId);
        }
        const kind = preferInline ? 'any' : (node.importKind ?? 'value');
        const source = `${scopeId}\u0000${target}\u0000${kind}`;
        let sourceNodes = imports.get(source);
        if (!sourceNodes) {
          sourceNodes = [];
          imports.set(source, sourceNodes);
        }
        sourceNodes.push(node);
      },
      'Program:exit'() {
        for (const nodes of imports.values()) {
          nodes.forEach((duplicate, index) => {
            const first = nodes
              .slice(0, index)
              .find((earlier) => !unmergeable(earlier, duplicate));
            if (!first) return;
            context.report({
              node: duplicate,
              messageId: 'noDuplicates',
              fix(fixer: TSESLint.RuleFixer) {
                // Simple fix: if both are named imports, merge them
                const firstHasDefault = first.specifiers.some(
                  (s: TSESTree.ImportClause) =>
                    s.type === 'ImportDefaultSpecifier',
                );
                const duplicateHasDefault = duplicate.specifiers.some(
                  (s: TSESTree.ImportClause) =>
                    s.type === 'ImportDefaultSpecifier',
                );

                const firstHasNamespace = first.specifiers.some(
                  (s: TSESTree.ImportClause) =>
                    s.type === 'ImportNamespaceSpecifier',
                );
                const duplicateHasNamespace = duplicate.specifiers.some(
                  (s: TSESTree.ImportClause) =>
                    s.type === 'ImportNamespaceSpecifier',
                );

                if (firstHasNamespace || duplicateHasNamespace) {
                  return null; // Too complex to merge namespace imports automatically
                }

                if (firstHasDefault && duplicateHasDefault) {
                  return null; // Cannot have two default imports
                }

                // If duplicate is empty (side-effect), just remove it
                if (duplicate.specifiers.length === 0) {
                  return fixer.remove(duplicate);
                }

                // If first is empty (side-effect), we can't easily merge into it without more logic
                if (first.specifiers.length === 0) {
                  return null;
                }

                // A default in the duplicate cannot be spliced into another
                // statement's braces: `import { a, d }` would import a NAMED
                // `d`, not the default. Nor can a value import be spliced
                // into an `import type` statement (`prefer-inline`), which
                // would make its names type-only.
                if (
                  duplicateHasDefault ||
                  (first.importKind === 'type' &&
                    duplicate.importKind !== 'type')
                ) {
                  return null;
                }

                const sourceCode = context.sourceCode;
                // `prefer-inline`: names from `import type` keep their
                // meaning inside a value import as inline `type` specifiers.
                const inline =
                  duplicate.importKind === 'type' && first.importKind !== 'type'
                    ? 'type '
                    : '';
                const specifiersToAdd = duplicate.specifiers.map(
                  (s: TSESTree.ImportClause) =>
                    `${inline}${sourceCode.getText(s)}`,
                );
                const firstNamed = first.specifiers.filter(
                  (s: TSESTree.ImportClause) => s.type === 'ImportSpecifier',
                );
                // Into the first's braces, or a new brace group after its
                // default (`import d, { a }`).
                const lastSpecifier =
                  firstNamed[firstNamed.length - 1] ?? first.specifiers[0];
                const replacement = firstNamed.length
                  ? `, ${specifiersToAdd.join(', ')}`
                  : `, { ${specifiersToAdd.join(', ')} }`;

                return [
                  fixer.insertTextAfter(lastSpecifier, replacement),
                  fixer.remove(duplicate),
                ];
              },
            });
          });
        }
      },
    };
  },
});
