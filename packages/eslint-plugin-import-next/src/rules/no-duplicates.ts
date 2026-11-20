/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import * as path from 'node:path';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

import {
  RUNTIME_CONDITIONS,
  resolveWithSettings,
} from '../utils/settings-resolver';

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
const hasDefault = (d: TSESTree.ImportDeclaration) =>
  d.specifiers.some((s) => s.type === 'ImportDefaultSpecifier');

/**
 * A type-only default beside a type-only named or namespace import cannot be
 * one statement: TypeScript rejects `import type D, { A }` (TS1363). They are
 * still two imports of one module and are reported, but not merged.
 */
const unmergeable = (
  a: TSESTree.ImportDeclaration,
  b: TSESTree.ImportDeclaration,
) =>
  a.importKind === 'type' &&
  b.importKind === 'type' &&
  hasDefault(a) !== hasDefault(b);

/**
 * eslint-plugin-import's four buckets. Imports of one module are duplicates
 * when they land in the same bucket:
 *
 *   - `import type D` (a type-only default) and `import type { A }` (or any
 *     other `import type`) are kept apart, and both apart from value imports:
 *     folding a type-only import into a value import would create a runtime
 *     dependency that was not there;
 *   - an import with an inline `type` specifier (`import { type A }`) goes
 *     with the `import type { ... }` statements;
 *   - `import * as ns` goes with other namespace imports only: it cannot
 *     share a statement with `{ a }`;
 *   - everything else is a value import.
 *
 * `prefer-inline` drops the type buckets: a type-only import is a duplicate
 * of a value import of the same module, merged as inline `type` specifiers.
 */
function bucketOf(node: TSESTree.ImportDeclaration, preferInline: boolean) {
  if (!preferInline && node.importKind === 'type') {
    return node.specifiers[0]?.type === 'ImportDefaultSpecifier'
      ? 'defaultTypes'
      : 'namedTypes';
  }
  if (
    !preferInline &&
    node.specifiers.some(
      (s) => s.type === 'ImportSpecifier' && s.importKind === 'type',
    )
  ) {
    return 'namedTypes';
  }
  return hasNamespace(node) ? 'namespaces' : 'values';
}

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
    // One line naming the module, as eslint-plugin-import's
    // (`'./dep' imported multiple times.`): a drop-in rule's output is read
    // beside the incumbent's, so it is not formatLLMMessage's two-line,
    // icon-and-severity shape. `{{file}}` is the file both resolve to, when
    // they resolve, relative to the working directory.
    messages: {
      noDuplicates: "'{{module}}' imported multiple times{{file}}.",
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
    let resolvedTo: Map<TSESTree.ImportDeclaration, string | null>;
    let scopes: Map<TSESTree.Node | null, number>;
    let ignoreQuery: boolean;
    let preferInline: boolean;

    return {
      before() {
        imports = new Map<string, TSESTree.ImportDeclaration[]>();
        resolvedTo = new Map();
        scopes = new Map<TSESTree.Node | null, number>();
        const [options] = context.options;
        ignoreQuery = options?.considerQueryString === false;
        preferInline = options?.['prefer-inline'] === true;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Keyed by the module, the scope and eslint-plugin-import's bucket
        // (`bucketOf`). `import type { T } from 'm'` beside
        // `import { v } from 'm'` is not a duplicate: the type-only form is
        // erased at compile time, so folding it into the value import creates a
        // runtime dependency that was not there and defeats
        // `verbatimModuleSyntax` and tree-shaking.
        //
        // The module is the file the resolver sees: './m' and './m.js' (for
        // m.ts) and './m/index' are one module, and so are a bare specifier
        // and a relative one that resolve to the same file (the node
        // resolver's `paths`). A specifier that does not resolve keeps its
        // own spelling; a query ('./m?raw') stays part of the module.
        //
        // The module is the one that RUNS: resolved without the `types`
        // condition. svelte sends `.` and `./store` to one `types` file, and
        // keying by it made `svelte` and `svelte/store` one module.
        //
        // `considerQueryString: false` drops the query before any of that.
        const written = node.source.value;
        const spec = ignoreQuery ? written.replace(/\?.*$/, '') : written;
        const target =
          resolveWithSettings(
            spec,
            context.filename,
            context.settings,
            undefined,
            undefined,
            RUNTIME_CONDITIONS,
          ) ?? spec;
        resolvedTo.set(node, target === spec ? null : target);
        const owner = enclosingModule(node);
        let scopeId = scopes.get(owner);
        if (scopeId === undefined) {
          scopeId = scopes.size;
          scopes.set(owner, scopeId);
        }
        const source = `${scopeId}\u0000${target}\u0000${bucketOf(node, preferInline)}`;
        let sourceNodes = imports.get(source);
        if (!sourceNodes) {
          sourceNodes = [];
          imports.set(source, sourceNodes);
        }
        sourceNodes.push(node);
      },
      'Program:exit'() {
        // Every import of a module that is imported more than once is
        // reported, the first included, as eslint-plugin-import does. The
        // fix rides on the later ones: each merges into the first.
        for (const nodes of imports.values()) {
          if (nodes.length < 2) continue;
          const [first, ...rest] = nodes;
          const file = resolvedTo.get(first);
          const data = {
            module: first.source.value,
            file: file ? ` (${path.relative(context.cwd, file)})` : '',
          };
          context.report({ node: first, messageId: 'noDuplicates', data });
          for (const duplicate of rest) {
            context.report({
              node: duplicate,
              messageId: 'noDuplicates',
              data,
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

                if (
                  firstHasNamespace ||
                  duplicateHasNamespace ||
                  unmergeable(first, duplicate)
                ) {
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
          }
        }
      },
    };
  },
});
