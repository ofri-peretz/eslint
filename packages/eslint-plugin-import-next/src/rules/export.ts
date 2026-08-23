/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: export
 * Forbid any invalid exports, i.e. re-export of the same name
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/export.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'duplicateExport' | 'duplicateDefault';

type RuleOptions = [];

export const exportRule = createRule<RuleOptions, MessageIds>({
  name: 'export',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/export.md',
      description: 'Forbid any invalid exports, i.e. re-export of the same name',
      cwe: 'CWE-694',
      cvss: 7.5,
    },
    messages: {
      duplicateExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Duplicate Export',
        cwe: 'CWE-694',
        description: 'Multiple exports of name "{{name}}"',
        severity: 'HIGH',
        fix: 'Remove duplicate export or rename one of them',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/export.md',
      }),
      duplicateDefault: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Duplicate Default Export',
        cwe: 'CWE-694',
        description: 'Multiple default exports',
        severity: 'HIGH',
        fix: 'A module can only have one default export',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/export.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * TypeScript has TWO declaration spaces, and a name may occupy both.
     *
     *   export type Twilio = ITwilio
     *   export const Twilio = ITwilio    // legal, and extremely common
     *
     * A single name-keyed map called that a duplicate export. On the pinned
     * corpus it produced 758 findings in twilio-node alone — every one of them
     * this shape, in a generated SDK where the pattern is deliberate.
     *
     * Interfaces are tracked apart from other type declarations because
     * `interface X {}` twice in one file is declaration MERGING, which is also
     * legal. `type X` twice is not, and neither is `interface X` beside
     * `type X`.
     */
    const valueNames = new Map<string, TSESTree.Node>();
    const typeNames = new Map<string, TSESTree.Node>();
    const mergeableInterfaces = new Set<string>();
    let hasDefaultExport: TSESTree.Node | null = null;

    type Space = 'value' | 'type' | 'interface';

    /**
     * The namespace path a declaration sits inside, as a key prefix.
     *
     * `export type T` inside `export namespace A` exports `A.T`, not `T`. The
     * maps were keyed on the bare name, so Stripe's `.d.ts` files reported
     * `PaymentIntent.SetupFutureUsage` and
     * `PaymentIntentConfirmParams.SetupFutureUsage` as the same export. They
     * are two distinct types that happen to share a member name — which is the
     * whole point of a namespace.
     *
     * A prefix rather than a skip, so a genuine duplicate INSIDE one namespace
     * still reports. Anonymous or computed module names (`declare module 'x'`)
     * contribute their raw text, which is stable within a file and is all this
     * key needs to be.
     */
    function scopeKey(node: TSESTree.Node): string {
      const parts: string[] = [];
      let current = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      while (current) {
        if (current.type === 'TSModuleDeclaration') {
          const id = (current as TSESTree.TSModuleDeclaration).id;
          // Three shapes. An Identifier for `namespace A`; a StringLiteral for
          // `declare module 'x'`, where the VALUE is the key — printed text
          // would keep the quote style, so `declare module 'x'` and
          // `declare module "x"` would land in different buckets despite being
          // the same ambient module to TypeScript; and a TSQualifiedName for
          // `namespace A.B`, which has no value to read and whose printed text
          // is unambiguous.
          if (id.type === 'Identifier') {
            parts.push(id.name);
          } else if (id.type === 'Literal') {
            parts.push(String(id.value));
          } else {
            parts.push(context.sourceCode.getText(id));
          }
        }
        current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      }
      return parts.length > 0 ? `${parts.reverse().join('.')}.` : '';
    }

    function checkAndAddExport(
      rawName: string,
      node: TSESTree.Node,
      space: Space = 'value',
    ) {
      const name = `${scopeKey(node)}${rawName}`;
      // `interface X` merges with an earlier `interface X`, so a repeat is only
      // a conflict when the earlier declaration was NOT an interface.
      if (space === 'interface') {
        const clash = typeNames.get(name);
        if (clash && !mergeableInterfaces.has(name)) {
          context.report({ node, messageId: 'duplicateExport', data: { name: rawName } });
          return;
        }
        mergeableInterfaces.add(name);
        typeNames.set(name, node);
        return;
      }

      const bucket = space === 'type' ? typeNames : valueNames;
      if (bucket.has(name)) {
        context.report({
          node,
          messageId: 'duplicateExport',
          data: { name: rawName },
        });
        return;
      }
      // No separate `interface` check is needed here: the interface branch
      // above writes into `typeNames`, which IS `bucket` for type space, so
      // `type X` after `interface X` is already caught by the test above.
      bucket.set(name, node);
    }

    function checkDefaultExport(node: TSESTree.Node) {
      if (hasDefaultExport) {
        context.report({
          node,
          messageId: 'duplicateDefault',
        });
      } else {
        hasDefaultExport = node;
      }
    }

    return {
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        checkDefaultExport(node);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Export with declaration: export const foo = 1;
        if (node.declaration) {
          if (node.declaration.type === AST_NODE_TYPES.VariableDeclaration) {
            node.declaration.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
              if (decl.id.type === AST_NODE_TYPES.Identifier) {
                checkAndAddExport(decl.id.name, node);
              }
            });
          } else if (
            node.declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
            node.declaration.type === AST_NODE_TYPES.ClassDeclaration
          ) {
            if (node.declaration.id) {
              checkAndAddExport(node.declaration.id.name, node);
            }
          } else if (node.declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration) {
            // `id` is required on an interface and on a type alias — neither
            // parses without a name — so no presence check here. Guarding
            // anyway would add a branch no input can take.
            checkAndAddExport(node.declaration.id.name, node, 'interface');
          } else if (node.declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
            checkAndAddExport(node.declaration.id.name, node, 'type');
          } else if (node.declaration.type === AST_NODE_TYPES.TSEnumDeclaration) {
            // An enum creates a type AND a value, so it collides with either —
            // but it is ONE declaration and must produce ONE report. Routing it
            // through two `checkAndAddExport` calls made `export enum Foo {}`
            // twice report the same node twice, because both buckets were
            // already populated by the first enum. `id` is required here for
            // the same reason it is on interfaces and type aliases.
            //
            // Scoped like every other branch. This one wrote to the maps
            // directly rather than through `checkAndAddExport`, so it was the
            // one place the namespace prefix did not reach: two enums of the
            // same name in different namespaces collided, and an enum beside a
            // same-named type INSIDE one namespace was missed. The diagnostic
            // still names the bare enum.
            const enumName = node.declaration.id.name;
            const scopedEnum = `${scopeKey(node)}${enumName}`;
            if (valueNames.has(scopedEnum) || typeNames.has(scopedEnum)) {
              context.report({ node, messageId: 'duplicateExport', data: { name: enumName } });
            } else {
              valueNames.set(scopedEnum, node);
              typeNames.set(scopedEnum, node);
            }
          }
        }

        // Export specifiers: export { foo, bar };
        node.specifiers.forEach((spec: TSESTree.ExportSpecifier) => {
          const exportedName =
            spec.exported.type === AST_NODE_TYPES.Identifier
              ? spec.exported.name
              : spec.exported.value;

          if (exportedName === 'default') {
            checkDefaultExport(spec);
          } else {
            // `export type { X }` and `export { type X }` are type-space.
            const isTypeOnly =
              node.exportKind === 'type' ||
              (spec as TSESTree.ExportSpecifier & { exportKind?: string }).exportKind === 'type';
            checkAndAddExport(exportedName, spec, isTypeOnly ? 'type' : 'value');
          }
        });
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        // export * as name from '...'
        if (node.exported) {
          const exportedName = node.exported.name;
          checkAndAddExport(exportedName, node);
        }
        // Regular export * doesn't create named conflicts we can statically detect
      },
    };
  },
});
