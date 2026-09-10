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
]);

export const consistentFunctionScoping = createRule<RuleOptions, MessageIds>({
  name: 'consistent-function-scoping',
  meta: {
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

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { checkArrowFunctions = true } = options || {};

    // Track variables declared in each scope
    const scopeStack: Set<string>[] = [new Set()];

    function enterScope() {
      scopeStack.push(new Set());
    }

    function exitScope() {
      scopeStack.pop();
    }

    function addVariableToCurrentScope(name: string) {
      const currentScope = scopeStack[scopeStack.length - 1];
      if (currentScope) {
        currentScope.add(name);
      }
    }

    /**
     * Every name a binding target introduces, destructuring included.
     *
     * Only `Identifier` was recorded before, so `const { out } = opts` and
     * `function f({ out })` bound nothing as far as this rule was concerned. A
     * nested function that captured `out` then looked as though it captured
     * nothing, and the report asserted "doesn't capture outer variables" about
     * code where ESLint's own scope manager resolves the reference to the
     * enclosing function — with a suggested move that does not compile.
     */
    function addBindingToCurrentScope(target: TSESTree.Node) {
      switch (target.type) {
        case 'Identifier':
          addVariableToCurrentScope(target.name);
          break;
        case 'ObjectPattern':
          for (const prop of target.properties) {
            addBindingToCurrentScope(
              prop.type === 'RestElement' ? prop.argument : prop.value,
            );
          }
          break;
        case 'ArrayPattern':
          for (const element of target.elements) {
            if (element) addBindingToCurrentScope(element);
          }
          break;
        case 'AssignmentPattern':
          addBindingToCurrentScope(target.left);
          break;
        case 'RestElement':
          addBindingToCurrentScope(target.argument);
          break;
        case 'TSParameterProperty':
          addBindingToCurrentScope(target.parameter);
          break;
        // No default: the six cases above are every BindingName and every
        // Parameter shape, so a seventh would be a parser change, not a
        // reachable path.
      }
    }

    function getOuterScopeVariables(): Set<string> {
      const outerScopes = scopeStack.slice(0, -1);
      const outerVars = new Set<string>();
      for (const scope of outerScopes) {
        for (const varName of scope) {
          outerVars.add(varName);
        }
      }
      return outerVars;
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
      const referencedVars = new Set<string>();

      /**
       * No `visited` set and no `depth > 10` early return.
       *
       * Both existed to survive the `parent` link, which made the "tree" a
       * cyclic graph. Skipping `parent` below leaves an actual tree, so a node
       * cannot be reached twice, and the `depth < 10` gate on the recursion
       * means `depth > 10` was never true either — coverage said so with a
       * line that could not be taken.
       *
       * The depth cap stays: it is why `a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p` is
       * only partly collected, and there is a fixture pinning that.
       */
      function collectReferences(astNode: TSESTree.Node, depth = 0) {
        if (astNode.type === 'Identifier') {
          referencedVars.add(astNode.name);
        }

        // Recursively check all child nodes with depth limit
        if (depth < 10) {
          for (const key in astNode) {
            /**
             * `parent` is a link BACK UP the tree, not a child.
             *
             * Walking it turned this from "which names does the body use" into
             * "which names appear anywhere in the file". Every arrow function
             * therefore looked as though it captured its own binding and its
             * enclosing function, so it never reported — measured on the probe
             * below, an arrow whose entire body is `42` collected
             * `helper, outer`. Only the `function` declaration form ever fired,
             * which is why the rule looked like it worked.
             */
            if (key === 'parent') continue;
            const child = (astNode as unknown as Record<string, unknown>)[key];
            if (child && typeof child === 'object') {
              if (Array.isArray(child)) {
                child.forEach((item) => {
                  if (item && typeof item === 'object' && 'type' in item) {
                    collectReferences(item, depth + 1);
                  }
                });
              } else if ('type' in child) {
                // Outer `child && typeof child === 'object'` already guarantees
                // a non-null object here (CodeQL: `js/comparison-between-incompatible-types`).
                collectReferences(child as TSESTree.Node, depth + 1);
              }
            }
          }
        }
      }

      // Collect all references in the function body
      if (node.body.type === 'BlockStatement') {
        node.body.body.forEach((stmt: TSESTree.Statement) =>
          collectReferences(stmt),
        );
      } else {
        // Arrow function with expression body
        collectReferences(node.body);
      }

      // Check function parameters
      node.params.forEach((param: TSESTree.Parameter) => {
        collectReferences(param);
      });

      // Get variables from outer scopes
      const outerVars = getOuterScopeVariables();

      /*
       * The names this function BINDS — its parameters and its own name.
       *
       * `collectReferences(param)` walks the whole pattern, so a destructured
       * `{ value }` was recorded as a USE of `value`; an outer binding that
       * happened to share the name then made the function look captured, and a
       * perfectly movable function went unreported. Every mention of that name
       * inside the body resolves to the parameter anyway — the outer one is
       * shadowed, not captured. Default VALUES are unaffected and still count:
       * `inner(v = fallback)` really does read `fallback` from outside, and
       * `collectReferences` still records it.
       */
      const boundNames = new Set(
        context.sourceCode.getDeclaredVariables(node).map((v) => v.name),
      );

      // Check if function captures any outer variables
      let capturesOuterVar = false;
      for (const ref of referencedVars) {
        if (!boundNames.has(ref) && outerVars.has(ref)) {
          capturesOuterVar = true;
          break;
        }
      }

      // If function doesn't capture any outer variables, it can be moved up
      if (!capturesOuterVar) {
        // Additional check: ensure function name doesn't conflict at module scope
        const functionName =
          node.type === 'FunctionDeclaration' ? node.id?.name : undefined;
        const moduleScope = scopeStack[0];

        if (!functionName || !moduleScope.has(functionName)) {
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
                  // This is a complex fix that would require:
                  // 1. Finding the module scope location
                  // 2. Moving the function declaration33 3
                  // 3. Updating any references
                  // For now, just provide a suggestion
                  return fixer.insertTextBefore(
                    node,
                    "// TODO: Move this function to module scope - it doesn't capture outer variables\n",
                  );
                },
              },
            ],
          });
        }
      }
    }

    return {
      Program() {
        enterScope();
      },

      'Program:exit'() {
        exitScope();
      },

      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        enterScope();
        // Add function parameters to the current scope
        node.params.forEach((param: TSESTree.Parameter) => {
          addBindingToCurrentScope(param);
        });
        analyzeFunction(node);
      },

      'FunctionDeclaration:exit'() {
        exitScope();
      },

      FunctionExpression(node: TSESTree.FunctionExpression) {
        enterScope();
        // Add function parameters to the current scope
        node.params.forEach((param: TSESTree.Parameter) => {
          addBindingToCurrentScope(param);
        });
        // Only check function expressions if they are assigned to variables
        // (not just used as callbacks)
        analyzeFunction(node);
      },

      'FunctionExpression:exit'() {
        exitScope();
      },

      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
        enterScope();
        // Add function parameters to the current scope
        node.params.forEach((param: TSESTree.Parameter) => {
          addBindingToCurrentScope(param);
        });
        if (checkArrowFunctions) {
          analyzeFunction(node);
        }
      },

      'ArrowFunctionExpression:exit'() {
        exitScope();
      },

      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        // Add variables to current scope
        node.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
          addBindingToCurrentScope(decl.id);
        });
      },
    };
  },
});
