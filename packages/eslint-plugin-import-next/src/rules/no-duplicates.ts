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

/**
 * `import * as ns` beside `import { a }` of one module cannot be one
 * statement (`import * as ns, { a }` is not valid syntax), and neither adds
 * nothing to the other: not a duplicate. Every other pair of value imports
 * (or of `import type` statements) can be merged or is redundant.
 */
const unmergeable = (
  a: TSESTree.ImportDeclaration,
  b: TSESTree.ImportDeclaration,
) => (hasNamespace(a) && hasNamed(b)) || (hasNamespace(b) && hasNamed(a));

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
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let imports: Map<string, TSESTree.ImportDeclaration[]>;
    let scopes: Map<TSESTree.Node | null, number>;
    return {
      before() {
        imports = new Map<string, TSESTree.ImportDeclaration[]>();
        scopes = new Map<TSESTree.Node | null, number>();
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
        const spec = node.source.value;
        const target = spec.startsWith('.')
          ? (resolveModule(spec, context.filename) ?? spec)
          : spec;
        const owner = enclosingModule(node);
        let scopeId = scopes.get(owner);
        if (scopeId === undefined) {
          scopeId = scopes.size;
          scopes.set(owner, scopeId);
        }
        const source = `${scopeId}\u0000${target}\u0000${node.importKind ?? 'value'}`;
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
                // `d`, not the default.
                if (duplicateHasDefault) {
                  return null;
                }

                const sourceCode = context.sourceCode;
                const specifiersToAdd = duplicate.specifiers.map(
                  (s: TSESTree.ImportClause) => sourceCode.getText(s),
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
