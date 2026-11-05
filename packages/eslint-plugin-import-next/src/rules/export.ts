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

/**
 * What an export of a name declares, as TypeScript's declaration-merging
 * table sees it. `specifier` is `export { v as N }` of a local, `reexport` is
 * `export { x as N } from 'm'`, `starAs` is `export * as N from 'm'`.
 */
type ExportKind =
  | 'variable'
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'enumBare'
  | 'namespace'
  | 'typeNamespace'
  | 'specifier'
  | 'typeSpecifier'
  | 'reexport'
  | 'starAs';

/** Exports that occupy only the value space. */
const VALUE_ONLY = new Set<ExportKind>([
  'variable',
  'function',
  'specifier',
  'reexport',
  'starAs',
]);
/** Exports that occupy only the type space. */
const TYPE_ONLY = new Set<ExportKind>(['interface', 'type']);
/** Declarations TypeScript merges into one export. */
const MERGES: ReadonlyArray<readonly [ExportKind, ExportKind]> = [
  ['interface', 'interface'],
  ['class', 'interface'],
  ['enum', 'enum'],
  ['enum', 'enumBare'],
  ['namespace', 'namespace'],
  ['namespace', 'function'],
  ['namespace', 'class'],
  ['namespace', 'enum'],
  ['namespace', 'enumBare'],
  ['namespace', 'interface'],
  ['namespace', 'type'],
  ['namespace', 'typeSpecifier'],
];

/**
 * May two exports of one name coexist? A value and a pure type live in
 * different declaration spaces (`export type Twilio` beside
 * `export const Twilio` is legal and common); the MERGES pairs are
 * declaration merging. Everything else is a duplicate TypeScript rejects:
 * `export enum E` twice merges, `export class C` beside `export type C` does
 * not (a class is a type too), two enums merge only when at most one omits
 * its first member's initializer (`enumBare`), and an export specifier is an alias that
 * clashes with any value, even when written `export type { T as N }`.
 * A re-export beside a pure type is legal when its target is a value, which
 * this file cannot see, so it is treated as one: silent.
 */
function canShareName(a: ExportKind, b: ExportKind): boolean {
  // A namespace of types only declares no value: it merges with everything
  // except `export * as N`, which TypeScript rejects beside it.
  if (a === 'typeNamespace' || b === 'typeNamespace') {
    return a !== 'starAs' && b !== 'starAs';
  }
  if (VALUE_ONLY.has(a) && TYPE_ONLY.has(b)) return true;
  if (VALUE_ONLY.has(b) && TYPE_ONLY.has(a)) return true;
  return MERGES.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/**
 * Does a namespace declare a value (TypeScript's "instantiated" namespace)?
 * One holding only interfaces, type aliases, `const enum`s and namespaces of
 * the same kind declares none: `export const Status = ...` beside
 * `export namespace Status { export type Code = ... }` is legal and common.
 */
function isInstantiated(namespace: TSESTree.TSModuleDeclaration): boolean {
  // An exported `namespace N {}` always has a block body.
  const body = namespace.body as TSESTree.TSModuleBlock;
  return body.body.some((statement) => {
    const declaration =
      statement.type === AST_NODE_TYPES.ExportNamedDeclaration
        ? statement.declaration
        : statement;
    switch (declaration?.type) {
      case AST_NODE_TYPES.TSInterfaceDeclaration:
      case AST_NODE_TYPES.TSTypeAliasDeclaration:
        return false;
      case AST_NODE_TYPES.TSEnumDeclaration:
        return !declaration.const;
      case AST_NODE_TYPES.TSModuleDeclaration:
        return isInstantiated(declaration);
      default:
        // A value declaration, a statement, or `export { v }`.
        return true;
    }
  });
}

export const exportRule = createRule<RuleOptions, MessageIds>({
  name: 'export',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/export',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/export.md',
      description:
        'Forbid any invalid exports, i.e. re-export of the same name',
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let exportsByName: Map<string, ExportKind[]>;
    let hasDefaultExport: TSESTree.Node | null;

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
        current = (current as TSESTree.Node & { parent?: TSESTree.Node })
          .parent;
      }
      return parts.length > 0 ? `${parts.reverse().join('.')}.` : '';
    }

    function checkAndAddExport(
      rawName: string,
      node: TSESTree.Node,
      kind: ExportKind,
    ) {
      const name = `${scopeKey(node)}${rawName}`;
      const previous = exportsByName.get(name);
      if (!previous) {
        exportsByName.set(name, [kind]);
        return;
      }
      if (previous.some((other) => !canShareName(other, kind))) {
        context.report({
          node,
          messageId: 'duplicateExport',
          data: { name: rawName },
        });
        return;
      }
      previous.push(kind);
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
      before() {
        exportsByName = new Map<string, ExportKind[]>();
        hasDefaultExport = null;
      },
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        checkDefaultExport(node);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        const declaration = node.declaration;
        if (declaration) {
          switch (declaration.type) {
            case AST_NODE_TYPES.VariableDeclaration:
              // `export const { a, b: [c] } = o` exports every bound name.
              for (const variable of context.sourceCode.getDeclaredVariables(
                declaration,
              )) {
                checkAndAddExport(variable.name, node, 'variable');
              }
              break;
            // An overload signature is a TSDeclareFunction, not a second
            // declaration, so `function f(a: string): void; function f(a) {}`
            // registers once.
            case AST_NODE_TYPES.FunctionDeclaration:
            case AST_NODE_TYPES.ClassDeclaration:
              if (declaration.id) {
                checkAndAddExport(
                  declaration.id.name,
                  node,
                  declaration.type === AST_NODE_TYPES.ClassDeclaration
                    ? 'class'
                    : 'function',
                );
              }
              break;
            case AST_NODE_TYPES.TSInterfaceDeclaration:
              checkAndAddExport(declaration.id.name, node, 'interface');
              break;
            case AST_NODE_TYPES.TSTypeAliasDeclaration:
              checkAndAddExport(declaration.id.name, node, 'type');
              break;
            case AST_NODE_TYPES.TSEnumDeclaration:
              checkAndAddExport(
                declaration.id.name,
                node,
                declaration.body.members[0] &&
                  !declaration.body.members[0].initializer
                  ? 'enumBare'
                  : 'enum',
              );
              break;
            case AST_NODE_TYPES.TSModuleDeclaration:
              // `export namespace N {}` (an Identifier id); a string-named
              // `declare module 'x'` is not an export of this module.
              if (declaration.id.type === AST_NODE_TYPES.Identifier) {
                checkAndAddExport(
                  declaration.id.name,
                  node,
                  isInstantiated(declaration) ? 'namespace' : 'typeNamespace',
                );
              }
              break;
            default:
              break;
          }
        }

        for (const spec of node.specifiers) {
          const exportedName =
            spec.exported.type === AST_NODE_TYPES.Identifier
              ? spec.exported.name
              : spec.exported.value;

          if (exportedName === 'default') {
            checkDefaultExport(spec);
            continue;
          }
          const isTypeOnly =
            node.exportKind === 'type' || spec.exportKind === 'type';
          checkAndAddExport(
            exportedName,
            spec,
            isTypeOnly
              ? 'typeSpecifier'
              : node.source
                ? 'reexport'
                : 'specifier',
          );
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        // export * as name from '...'
        if (node.exported) {
          checkAndAddExport(node.exported.name, node, 'starAs');
        }
        // Regular export * doesn't create named conflicts we can statically detect
      },
    };
  },
});
