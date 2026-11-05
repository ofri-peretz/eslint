/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: consistent-function-scoping
 * Disallow functions that are declared in a scope which does not capture any variables from the outer scope
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'inconsistentFunctionScoping' | 'moveToModuleScope';

export interface Options {
  /** Check arrow functions for scoping issues */
  checkArrowFunctions?: boolean;
}

type RuleOptions = [Options?];

/**
 * Nodes that can sit between a function and the scope it is declared in
 * without moving it: the declarator and declaration that bind it, and the
 * TypeScript type operators that only re-describe its type.
 */
const BINDING_WRAPPERS: ReadonlySet<string> = new Set([
  'VariableDeclarator',
  'VariableDeclaration',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  // Bound by assignment rather than by declaration. `api.direct = () => 1` at
  // the top level of a module puts the function at module scope exactly as
  // `const direct = () => 1` does, but the walk stopped at the
  // `AssignmentExpression` and never reached `Program`, so the rule told the
  // consumer to move an arrow to the scope it was already in — while its
  // `const`-bound twin, same body and same capture set, stayed silent. A
  // verdict decided purely by declaration syntax.
  'ExpressionStatement',
  'AssignmentExpression',
  // Chosen between, not moved. Both arms of `const pick = flag ? a : b` sit in
  // whatever scope the ternary sits in.
  'ConditionalExpression',
  'LogicalExpression',
]);

/**
 * Literals a function can sit inside without leaving the enclosing scope:
 * array elements and object property values.
 */
const LITERAL_CONTAINERS: ReadonlySet<string> = new Set([
  'ArrayExpression',
  'ObjectExpression',
  'Property',
]);

export const consistentFunctionScoping = createRule<RuleOptions, MessageIds>({
  name: 'consistent-function-scoping',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'unicorn/consistent-function-scoping',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-maintainability/docs/rules/consistent-function-scoping.md',
      description:
        'Move function definitions to the highest possible scope to improve readability and performance',
    },
    hasSuggestions: true,
    messages: {
      inconsistentFunctionScoping: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Inconsistent Function Scoping',
        description:
          "Function can be moved to higher scope as it doesn't capture outer variables",
        severity: 'MEDIUM',
        fix: 'Move function declaration to module scope',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-function-scoping.md',
      }),
      moveToModuleScope: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Function Scoping Optimization',
        description:
          'Function does not use variables from its containing scope and can be moved to module level',
        severity: 'MEDIUM',
        fix: 'Move function outside current scope: extract `function helper() { return "value"; }` to module level before the containing function/class',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-function-scoping.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkArrowFunctions: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ checkArrowFunctions: true }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let checkArrowFunctions: boolean;

    /**
     * Is `v` the helper's own binding? `function helper() { helper(); }` and
     * `const helper = () => helper()` name themselves; that is recursion, not
     * a capture of the enclosing scope.
     */
    function isOwnBinding(
      v: TSESLint.Scope.Variable,
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): boolean {
      return v.defs.some((def) => {
        if (def.node === node) return true;
        if (def.node.type !== 'VariableDeclarator') return false;
        let init: TSESTree.Node | null | undefined = def.node.init;
        while (init && BINDING_WRAPPERS.has(init.type)) {
          init = (init as { expression?: TSESTree.Node }).expression;
        }
        return init === node;
      });
    }

    /**
     * Does the helper reference a binding of an enclosing function (or block)?
     *
     * Decided by ESLint's scope manager, not by names. A hand-rolled stack of
     * declared NAMES used to stand in for it: a helper declaring its own
     * `const factor` read as using the outer `factor` and was never reported,
     * a type annotation naming the outer function's `type Unit` was not a use
     * at all (the suggested move did not compile), and references deeper than
     * ten AST levels were not collected. `scope.through` is every reference the
     * helper (and anything nested in it) leaves unresolved; one that resolves
     * to a variable outside module/global scope is a capture.
     */
    function capturesEnclosingBinding(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): boolean {
      const scope = context.sourceCode.getScope(node);
      return scope.through.some((ref) => {
        const v = ref.resolved;
        if (!v) return false;
        if (v.scope.type === 'module' || v.scope.type === 'global') {
          return false;
        }
        // A named function expression's own name lives in a scope of its own.
        if (v.scope.block === node) return false;
        return !isOwnBinding(v, node);
      });
    }

    /**
     * Does this arrow reference `this`?
     *
     * Nested arrows inherit the same `this`, so they count. A nested `function`
     * / method / class body rebinds it, so its `this` is a different one and
     * the walk stops there.
     */
    function capturesThis(node: TSESTree.Node): boolean {
      if (node.type === 'ThisExpression') return true;

      for (const key in node) {
        if (key === 'parent') continue;
        const value = (node as unknown as Record<string, unknown>)[key];
        const children = Array.isArray(value) ? value : [value];
        for (const child of children) {
          if (!child || typeof child !== 'object') continue;
          const childNode = child as TSESTree.Node;
          if (typeof childNode.type !== 'string') continue;
          if (
            childNode.type === 'ClassDeclaration' ||
            childNode.type === 'ClassExpression'
          ) {
            /*
             * A class BODY rebinds `this`, but its heritage clause and any
             * computed member key are evaluated in the enclosing scope, with
             * the enclosing `this`. Skipping the whole node lost both, so
             * `() => class Inner extends this.Base {}` read as capturing
             * nothing and the rule offered to move it to module scope — where
             * `this` is a different object.
             */
            if (childNode.superClass && capturesThis(childNode.superClass)) {
              return true;
            }
            for (const member of childNode.body.body) {
              if (
                'computed' in member &&
                member.computed &&
                capturesThis(member.key)
              ) {
                return true;
              }
            }
            continue;
          }
          if (
            childNode.type === 'FunctionDeclaration' ||
            childNode.type === 'FunctionExpression'
          ) {
            continue;
          }
          if (capturesThis(childNode)) return true;
        }
      }

      return false;
    }

    function analyzeFunction(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ) {
      /**
       * Already at the top scope, so there is nowhere to move it.
       *
       * The check used to look at the DIRECT parent only, which catches
       * `function f() {}` but not `const f = function () {}` — there the parent
       * is a `VariableDeclarator`. Module-level function expressions were saved
       * instead by the `parent`-chain bug in `collectReferences`, which made
       * them look as though they captured their own binding. Fixing that walk
       * exposed this: four fixtures whose comment described the bug as the
       * reason they were valid.
       *
       * A type operator between the function and its binding is stepped over
       * too. `const noExit = (() => undefined) as unknown as (code: number) =>
       * never;` sits at module scope exactly as `const noExit = () =>
       * undefined;` does — `as`, `satisfies`, `!` and `<T>` change what
       * TypeScript believes about the value and nothing about where it lives.
       * Stopping at the assertion made the rule tell a consumer to move an
       * arrow to the scope it was already in.
       */
      let ancestor: TSESTree.Node | undefined = node.parent;
      while (ancestor && BINDING_WRAPPERS.has(ancestor.type)) {
        ancestor = ancestor.parent;
      }
      // Array and object literals create no scope either: an arrow in a
      // module-level `it.each` table or `{ key: () => … }` is at module scope,
      // and the docs ask for a HIGHER scope, which does not exist.
      while (ancestor && LITERAL_CONTAINERS.has(ancestor.type)) {
        ancestor = ancestor.parent;
        while (ancestor && BINDING_WRAPPERS.has(ancestor.type)) {
          ancestor = ancestor.parent;
        }
      }
      if (
        ancestor?.type === 'Program' ||
        ancestor?.type === 'ExportNamedDeclaration' ||
        ancestor?.type === 'ExportDefaultDeclaration'
      ) {
        return;
      }

      // Class methods / class field initializers — these are bound to the
      // instance and cannot be moved to module scope. The parent chain is
      // `MethodDefinition` (regular methods) or `PropertyDefinition` (class
      // fields). Without this exemption, every method that doesn't reference
      // `this` is wrongly flagged.
      const p = node.parent;
      if (p?.type === 'MethodDefinition' || p?.type === 'PropertyDefinition') {
        return;
      }

      /**
       * An arrow captures `this` lexically, so it is bound to the instance for
       * the same reason the methods above are — moving it to module scope makes
       * `this` undefined (TS2532 under --strict, a TypeError at runtime).
       *
       * The exemption above was positional and so never reached an arrow nested
       * INSIDE a method: the rule was exactly backwards on the axis it says it
       * cares about, exempting methods that never touch `this` while reporting
       * arrows that do.
       *
       * Only arrows. A nested `function` declaration's `this` is dynamic, so
       * hoisting it and keeping `f.call(this)` compiles and runs — that report
       * is legitimate and stays.
       */
      if (node.type === 'ArrowFunctionExpression' && capturesThis(node)) {
        return;
      }

      /**
       * A function passed as an ARGUMENT is inline by design. Always.
       *
       * This used to enumerate hosts — array methods, `.then`, `setTimeout`,
       * and then the test frameworks when `describe`/`it` turned out to be
       * 1,415 findings. That is a denylist wearing an allowlist's clothes: it
       * has to name every callback-taking function in the world, and the ones
       * it had not heard of reported. On the real-source scan the survivors
       * were `chrome.storage.onChanged.addListener(cb)` — `addEventListener`
       * was listed, `addListener` was not — and `defineBackground(cb)`, a
       * framework entry point no list would ever contain.
       *
       * The structural fact is the same for all of them and needs no
       * vocabulary: an argument cannot be moved to module scope without
       * changing what it is an argument to. What this rule is actually for is a
       * function BOUND to a name inside another function, which is the case
       * below.
       *
       * It also satisfies the suite's own litmus test — rename every
       * identifier to `foo` and the rule still behaves the same, which was not
       * true of any version that read `describe` or `map`.
       */
      if (p?.type === 'CallExpression' || p?.type === 'NewExpression') {
        return;
      }

      /**
       * A function that IS a property value cannot be moved out either —
       * `{ async execute(ctx) { … } }` is the object's method, and hoisting it
       * changes what the object is. The class equivalents are already exempt
       * above; this is the object-literal spelling of the same fact.
       */
      if (p?.type === 'Property') {
        return;
      }

      // Get all variables referenced in the function body
      if (capturesEnclosingBinding(node)) {
        return;
      }

      const functionName =
        node.type === 'FunctionDeclaration' ? node.id?.name : undefined;
      context.report({
        node,
        messageId: 'inconsistentFunctionScoping',
        data: {
          functionName: functionName || 'anonymous function',
        },
        suggest: [
          {
            messageId: 'moveToModuleScope',
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.insertTextBefore(
                node,
                "// TODO: Move this function to module scope - it doesn't capture outer variables\n",
              );
            },
          },
        ],
      });
    }

    return {
      before() {
        const [options] = context.options;
        ({ checkArrowFunctions = true } = options || {});
      },
      FunctionDeclaration: analyzeFunction,
      FunctionExpression: analyzeFunction,
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
        if (checkArrowFunctions) {
          analyzeFunction(node);
        }
      },
    };
  },
});
