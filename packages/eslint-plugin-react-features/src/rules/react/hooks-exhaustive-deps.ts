/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: hooks-exhaustive-deps
 * LLM-optimized wrapper for React hooks dependency array checking
 * 
 * This rule detects missing or extra dependencies in React hooks like
 * useEffect, useCallback, useMemo, and useLayoutEffect.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingDep'
  | 'extraDep'
  | 'unnecessaryDep'
  | 'suggestAddDep'
  | 'suggestRemoveDep'
  | 'depsNotArrayLiteral';

export interface Options {
  /** Additional hooks to check (e.g., custom hooks using useEffect internally) */
  additionalHooks?: string;
  /** Enable stale closure detection warnings */
  enableDangerousAutofixThisMayCauseInfiniteLoops?: boolean;
}

type RuleOptions = [Options?];

// Hook names that require dependency array checking
const HOOKS_WITH_DEPS = new Set([
  'useEffect',
  'useLayoutEffect',
  'useCallback',
  'useMemo',
  'useImperativeHandle',
]);

export const hooksExhaustiveDeps = createRule<RuleOptions, MessageIds>({
  name: 'hooks-exhaustive-deps',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/hooks-exhaustive-deps.md',
      description: 'Enforce exhaustive dependencies in React hooks to prevent stale closures',
      confidence: 'high',
    },
    hasSuggestions: true,
    messages: {
      missingDep: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Hook Dependency',
        description: 'React Hook {{hookName}} has missing dependencies: {{deps}}',
        severity: 'HIGH',
        fix: 'Add missing dependencies to the dependency array or memoize values with useMemo/useCallback',
        documentationLink: 'https://react.dev/reference/react/useEffect#specifying-reactive-dependencies',
      }),
      extraDep: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unnecessary Hook Dependency',
        description: 'React Hook {{hookName}} has unnecessary dependency: {{dep}}',
        severity: 'MEDIUM',
        fix: 'Remove the unnecessary dependency from the array - it never changes or is not used in the effect',
        documentationLink: 'https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies',
      }),
      unnecessaryDep: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Unnecessary Dependency',
        description: 'The dependency {{dep}} is stable and never changes',
        severity: 'LOW',
        fix: 'Consider removing stable dependencies like setState functions or refs',
        documentationLink: 'https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies',
      }),
      suggestAddDep: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Missing Dependency',
        description: 'Add {{dep}} to dependency array',
        severity: 'LOW',
        fix: 'Add the missing dependency to prevent stale closures',
        documentationLink: 'https://react.dev/reference/react/useEffect#specifying-reactive-dependencies',
      }),
      suggestRemoveDep: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove Unnecessary Dependency',
        description: 'Remove {{dep}} from dependency array',
        severity: 'LOW',
        fix: 'Remove the unnecessary dependency',
        documentationLink: 'https://react.dev/reference/react/useEffect#removing-unnecessary-dependencies',
      }),
      depsNotArrayLiteral: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Non-literal Dependency Array',
        description: 'React Hook {{hookName}} was passed a dependency list that is not an array literal. This means we cannot statically verify whether you have passed the correct dependencies.',
        severity: 'HIGH',
        fix: 'Replace the variable with an inline array literal: [dep1, dep2]. If you need dynamic deps, refactor to compute them inside the hook callback instead.',
        documentationLink: 'https://react.dev/reference/react/useEffect#specifying-reactive-dependencies',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalHooks: {
            type: 'string',
            description: 'Regex pattern for additional hooks to check (e.g., "useMyCustomHook")',
          },
          enableDangerousAutofixThisMayCauseInfiniteLoops: {
            type: 'boolean',
            default: false,
            description: 'Enable autofix (warning: may cause infinite loops)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const additionalHooksPattern = options.additionalHooks
      ? new RegExp(options.additionalHooks)
      : null;

    /**
     * Check if a call expression is a React hook with dependencies
     */
    function isHookWithDeps(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      
      // Direct hook call: useEffect(...)
      if (callee.type === 'Identifier') {
        if (HOOKS_WITH_DEPS.has(callee.name)) {
          return true;
        }
        if (additionalHooksPattern?.test(callee.name)) {
          return true;
        }
      }
      
      // Namespaced hook call: React.useEffect(...)
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'React' &&
        callee.property.type === 'Identifier' &&
        HOOKS_WITH_DEPS.has(callee.property.name)
      ) {
        return true;
      }
      
      return false;
    }

    /**
     * Get the hook name from a call expression
     */
    // oxlint-disable-next-line consistent-function-scoping
    function getHookName(node: TSESTree.CallExpression): string {
      const callee = node.callee;
      if (callee.type === 'Identifier') {
        return callee.name;
      }
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier'
      ) {
        return callee.property.name;
      }
      return 'unknown';
    }

    /**
     * Extract variables declared inside a function (to exclude from deps)
     */
    function extractLocallyDeclaredIdentifiers(node: TSESTree.Node): Set<string> {
      const declared = new Set<string>();
      const visited = new WeakSet<TSESTree.Node>();
      const skipKeys = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);
      
      function visit(n: TSESTree.Node) {
        if (visited.has(n)) return;
        visited.add(n);
        
        // Variable declarations: const x = 1, let y, var z
        if (n.type === 'VariableDeclaration') {
          for (const declarator of n.declarations) {
            if (declarator.id.type === 'Identifier') {
              declared.add(declarator.id.name);
            } else if (declarator.id.type === 'ObjectPattern') {
              // Destructuring: const { a, b } = obj
              for (const prop of declarator.id.properties) {
                if (prop.type === 'Property' && prop.value.type === 'Identifier') {
                  declared.add(prop.value.name);
                }
              }
            } else if (declarator.id.type === 'ArrayPattern') {
              // Array destructuring: const [a, b] = arr
              for (const element of declarator.id.elements) {
                if (element && element.type === 'Identifier') {
                  declared.add(element.name);
                }
              }
            }
          }
        }
        
        // Function parameters and declarations
        if (n.type === 'FunctionDeclaration' && n.id) {
          declared.add(n.id.name);
        }

        // Function parameters of nested arrow / function expressions —
        // these are LOCAL to the inner callback, not closures over the
        // hook's body. Without this, callbacks like `.then((r) => ...)`
        // had `r` flagged as a missing dependency (real FP found by the
        // CWE-react-hooks corpus).
        if (
          n.type === 'ArrowFunctionExpression' ||
          n.type === 'FunctionExpression' ||
          n.type === 'FunctionDeclaration'
        ) {
          const collectFromPattern = (param: TSESTree.Node) => {
            if (param.type === 'Identifier') {
              declared.add(param.name);
            } else if (param.type === 'ObjectPattern') {
              for (const prop of param.properties) {
                if (prop.type === 'Property' && prop.value.type === 'Identifier') {
                  declared.add(prop.value.name);
                } else if (prop.type === 'RestElement' && prop.argument.type === 'Identifier') {
                  declared.add(prop.argument.name);
                }
              }
            } else if (param.type === 'ArrayPattern') {
              for (const el of param.elements) {
                if (el && el.type === 'Identifier') declared.add(el.name);
              }
            } else if (param.type === 'RestElement' && param.argument.type === 'Identifier') {
              declared.add(param.argument.name);
            } else if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
              declared.add(param.left.name);
            }
          };
          for (const param of n.params) collectFromPattern(param);
        }
        
        // Traverse children
        for (const key of Object.keys(n)) {
          if (skipKeys.has(key)) continue;
          const child = (n as unknown as Record<string, unknown>)[key];
          if (child && typeof child === 'object') {
            if (Array.isArray(child)) {
              child.forEach((c) => {
                if (c && typeof c === 'object' && 'type' in c) {
                  visit(c as TSESTree.Node);
                }
              });
            } else if ('type' in child) {
              visit(child as TSESTree.Node);
            }
          }
        }
      }
      
      visit(node);
      return declared;
    }
    
    /**
     * Extract identifiers used inside a function node (only standalone identifiers, not property names)
     */
    function extractUsedIdentifiers(node: TSESTree.Node): Set<string> {
      const used = new Set<string>();
      const visited = new WeakSet<TSESTree.Node>();
      
      // Keys to skip during traversal (to avoid infinite loops)
      const skipKeys = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);
      
      function visit(n: TSESTree.Node, isPropertyKey = false) {
        // Prevent infinite loops
        if (visited.has(n)) {
          return;
        }
        visited.add(n);
        
        // For MemberExpression, only capture the object (root), not the property
        if (n.type === 'MemberExpression') {
          visit(n.object as TSESTree.Node, false);
          // Don't visit computed properties as property keys
          if (n.computed && n.property) {
            visit(n.property as TSESTree.Node, false);
          }
          // Non-computed properties are just property names, skip them
          return;
        }
        
        // For CallExpression, capture callee and arguments
        if (n.type === 'CallExpression') {
          if (n.callee) {
            visit(n.callee as TSESTree.Node, false);
          }
          if (n.arguments) {
            n.arguments.forEach((arg: TSESTree.Node) => visit(arg, false));
          }
          return;
        }
        
        // Only add identifiers that aren't property keys
        if (n.type === 'Identifier' && !isPropertyKey) {
          used.add(n.name);
        }
        
        // Traverse child nodes
        for (const key of Object.keys(n)) {
          // Skip parent and metadata to avoid circular references
          if (skipKeys.has(key)) {
            continue;
          }
          
          const child = (n as unknown as Record<string, unknown>)[key];
          if (child && typeof child === 'object') {
            if (Array.isArray(child)) {
              child.forEach((c) => {
                if (c && typeof c === 'object' && 'type' in c) {
                  visit(c as TSESTree.Node, false);
                }
              });
            } else if ('type' in child) {
              visit(child as TSESTree.Node, false);
            }
          }
        }
      }
      
      visit(node);
      return used;
    }

    /**
     * Extract dependencies from the dependency array
     */
    function extractDependencies(depsArray: TSESTree.ArrayExpression): Set<string> {
      const deps = new Set<string>();
      
      for (const element of depsArray.elements) {
        if (element?.type === 'Identifier') {
          deps.add(element.name);
        } else if (
          element?.type === 'MemberExpression' &&
          element.object.type === 'Identifier'
        ) {
          // For props.foo, we track the full path
          const sourceCode = context.sourceCode || context.getSourceCode();
          deps.add(sourceCode.getText(element));
        }
      }
      
      return deps;
    }

    /**
     * Check if an identifier is a stable React reference
     */
    // oxlint-disable-next-line consistent-function-scoping
    function isStableReference(name: string): boolean {
      // setState functions from useState are stable
      // dispatch from useReducer is stable
      // refs from useRef are stable
      const stablePatterns = [
        /^set[A-Z]/, // setState patterns
        /dispatch/i,
        /Ref$/,
      ];
      
      return stablePatterns.some((pattern) => pattern.test(name));
    }

    /**
     * Filter out stable references and non-reactive values
     */
    function filterReactiveDeps(used: Set<string>): Set<string> {
      const reactive = new Set<string>();
      
      // Common non-reactive values
      const nonReactive = new Set([
        'undefined',
        'null',
        'true',
        'false',
        'console',
        'window',
        'document',
        'Math',
        'JSON',
        'Object',
        'Array',
        'String',
        'Number',
        'Boolean',
        'Date',
        'Promise',
        'Error',
        'Map',
        'Set',
        'WeakMap',
        'WeakSet',
        'Symbol',
        'Reflect',
        'Proxy',
        'Intl',
        'navigator',
        'localStorage',
        'sessionStorage',
        'fetch',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ]);
      
      for (const name of used) {
        if (!nonReactive.has(name) && !isStableReference(name)) {
          reactive.add(name);
        }
      }
      
      return reactive;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isHookWithDeps(node)) {
          return;
        }

        const hookName = getHookName(node);
        const args = node.arguments;
        
        // Check if hook has a callback argument
        if (args.length === 0) {
          return;
        }
        
        const callback = args[0];
        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        ) {
          return;
        }
        
        // Get the dependency array (second argument)
        const depsArg = args[1];
        
        // If no deps array provided, don't warn (different rule)
        if (!depsArg) {
          return;
        }
        
        // Mirrors eslint-plugin-react-hooks: handle `as const` casts on the
        // deps array, then report when the deps argument is anything other
        // than an inline array literal (we can't statically verify a variable
        // reference, so the user gets no protection — silent skip would be
        // a missed FN, see CWE-XXX in next.js compiled bundles for examples).
        const isTSAsArrayExpression =
          depsArg.type === 'TSAsExpression' && depsArg.expression?.type === 'ArrayExpression';
        const isArrayExpression = depsArg.type === 'ArrayExpression';

        if (!isArrayExpression && !isTSAsArrayExpression) {
          context.report({
            node: depsArg,
            messageId: 'depsNotArrayLiteral',
            data: { hookName },
          });
          return;
        }

        const depsArrayNode = isTSAsArrayExpression
          ? ((depsArg as TSESTree.TSAsExpression).expression as TSESTree.ArrayExpression)
          : (depsArg as TSESTree.ArrayExpression);

        // Extract used identifiers from callback
        const usedInCallback = extractUsedIdentifiers(callback.body);
        
        // Extract locally declared identifiers (should not be dependencies)
        const locallyDeclared = extractLocallyDeclaredIdentifiers(callback.body);
        
        // Filter out locally declared vars before checking reactive deps
        const externalUsed = new Set<string>();
        for (const id of usedInCallback) {
          if (!locallyDeclared.has(id)) {
            externalUsed.add(id);
          }
        }
        
        const reactiveDeps = filterReactiveDeps(externalUsed);
        
        // Extract declared dependencies
        const declaredDeps = extractDependencies(depsArrayNode);
        
        // Find missing dependencies
        const missingDeps: string[] = [];
        for (const dep of reactiveDeps) {
          // Simple check - skip if it looks like a local variable or function
          // This is a simplified heuristic
          if (!declaredDeps.has(dep) && /^[a-z]/.test(dep)) {
            missingDeps.push(dep);
          }
        }
        
        // Find extra/unnecessary dependencies
        const extraDeps: string[] = [];
        for (const dep of declaredDeps) {
          if (!usedInCallback.has(dep) && !dep.includes('.')) {
            extraDeps.push(dep);
          }
        }
        
        // Report missing dependencies
        if (missingDeps.length > 0) {
          context.report({
            node: depsArg,
            messageId: 'missingDep',
            data: {
              hookName,
              deps: missingDeps.join(', '),
            },
            suggest: missingDeps.map((dep) => ({
              messageId: 'suggestAddDep' as const,
              data: { dep },
              fix(fixer: TSESLint.RuleFixer) {
                const lastElement = depsArrayNode.elements[depsArrayNode.elements.length - 1];
                if (lastElement) {
                  return fixer.insertTextAfter(lastElement, `, ${dep}`);
                } else {
                  // Empty array
                  return fixer.insertTextAfterRange(
                    [depsArrayNode.range[0] + 1, depsArrayNode.range[0] + 1],
                    dep
                  );
                }
              },
            })),
          });
        }
        
        // Report extra dependencies
        for (const dep of extraDeps) {
          context.report({
            node: depsArg,
            messageId: 'extraDep',
            data: {
              hookName,
              dep,
            },
            suggest: [
              {
                messageId: 'suggestRemoveDep' as const,
                data: { dep },
                fix(fixer: TSESLint.RuleFixer) {
                  const element = depsArrayNode.elements.find(
                    (el: TSESTree.Expression | TSESTree.SpreadElement | null) => el?.type === 'Identifier' && el.name === dep
                  );
                  if (element) {
                    const index = depsArrayNode.elements.indexOf(element);
                    const isLast = index === depsArrayNode.elements.length - 1;
                    const isFirst = index === 0;
                    
                    if (isFirst && depsArrayNode.elements.length > 1) {
                      // Remove first element and following comma
                      const nextElement = depsArrayNode.elements[1];
                      if (nextElement) {
                        return fixer.removeRange([
                          element.range[0],
                          nextElement.range[0],
                        ]);
                      }
                    } else if (isLast && index > 0) {
                      // Remove last element and preceding comma
                      const prevElement = depsArrayNode.elements[index - 1];
                      if (prevElement) {
                        return fixer.removeRange([
                          prevElement.range[1],
                          element.range[1],
                        ]);
                      }
                    }
                    
                    return fixer.remove(element);
                  }
                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});

