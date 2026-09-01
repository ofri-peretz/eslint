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

export const consistentFunctionScoping = createRule<RuleOptions, MessageIds>({
  name: 'consistent-function-scoping',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-maintainability/docs/rules/consistent-function-scoping.md',
      description: 'Move function definitions to the highest possible scope to improve readability and performance',
    },
    hasSuggestions: true,
    messages: {
      inconsistentFunctionScoping: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Inconsistent Function Scoping',
        description: 'Function can be moved to higher scope as it doesn\'t capture outer variables',
        severity: 'MEDIUM',
        fix: 'Move function declaration to module scope',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-function-scoping.md',
      }),
      moveToModuleScope: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Function Scoping Optimization',
        description: 'Function does not use variables from its containing scope and can be moved to module level',
        severity: 'MEDIUM',
        fix: 'Move function outside current scope: extract `function helper() { return "value"; }` to module level before the containing function/class',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/consistent-function-scoping.md',
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
    const {
      checkArrowFunctions = true,
    } = options || {};

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

    function analyzeFunction(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression) {
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
       */
      let ancestor: TSESTree.Node | undefined = node.parent;
      while (
        ancestor?.type === 'VariableDeclarator' ||
        ancestor?.type === 'VariableDeclaration'
      ) {
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
                child.forEach(item => {
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
        node.body.body.forEach((stmt: TSESTree.Statement) => collectReferences(stmt));
      } else {
        // Arrow function with expression body
        collectReferences(node.body);
      }

      // Check function parameters
      node.params.forEach((param: TSESTree.Parameter) => {
        if (param.type === 'Identifier') {
          referencedVars.add(param.name);
        }
      });

      // Get variables from outer scopes
      const outerVars = getOuterScopeVariables();

      // Check if function captures any outer variables
      let capturesOuterVar = false;
      for (const ref of referencedVars) {
        if (outerVars.has(ref)) {
          capturesOuterVar = true;
          break;
        }
      }

      // If function doesn't capture any outer variables, it can be moved up
      if (!capturesOuterVar) {
        // Additional check: ensure function name doesn't conflict at module scope
        const functionName = node.type === 'FunctionDeclaration' ? node.id?.name : undefined;
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
                  return fixer.insertTextBefore(node, '// TODO: Move this function to module scope - it doesn\'t capture outer variables\n');
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
          if (param.type === 'Identifier') {
            addVariableToCurrentScope(param.name);
          }
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
          if (param.type === 'Identifier') {
            addVariableToCurrentScope(param.name);
          }
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
          if (param.type === 'Identifier') {
            addVariableToCurrentScope(param.name);
          }
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
          if (decl.id.type === 'Identifier') {
            addVariableToCurrentScope(decl.id.name);
          }
        });
      },
    };
  },
});
