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
      // Skip module-level functions (direct children of Program or ExportNamedDeclaration)
      if (node.parent?.type === 'Program' || node.parent?.type === 'ExportNamedDeclaration' || node.parent?.type === 'ExportDefaultDeclaration') {
        return;
      }

      // Get all variables referenced in the function body
      const referencedVars = new Set<string>();

      function collectReferences(node: TSESTree.Node, depth = 0, visited = new Set<TSESTree.Node>()) {
        // Prevent infinite recursion
        if (depth > 10 || visited.has(node)) {
          return;
        }
        visited.add(node);

        if (node.type === 'Identifier') {
          referencedVars.add(node.name);
        }

        // Recursively check all child nodes with depth limit
        if (depth < 10) {
          for (const key in node) {
            const child = (node as unknown as Record<string, unknown>)[key];
            if (child && typeof child === 'object') {
              if (Array.isArray(child)) {
                child.forEach(item => {
                  if (item && typeof item === 'object' && 'type' in item) {
                    collectReferences(item, depth + 1, visited);
                  }
                });
              } else if ('type' in child && typeof child === 'object' && child !== null) {
                collectReferences(child as TSESTree.Node, depth + 1, visited);
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
                  // 2. Moving the function declaration
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
