/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-null-checks
 * Detects potential null pointer dereferences
 * CWE-476: NULL Pointer Dereference
 *
 * @see https://cwe.mitre.org/data/definitions/476.html
 * @see https://rules.sonarsource.com/javascript/RSPEC-2259/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingNullCheck'
  | 'useOptionalChaining'
  | 'useNullishCoalescing'
  | 'addExplicitCheck';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;

  /** Require explicit null checks. Default: false */
  requireExplicitChecks?: boolean;
}

type RuleOptions = [Options?];

/**
 * Globals and built-ins that are never null/undefined. Property access on
 * these doesn't need a null check.
 */
// Built-in namespaces that are never null AND aren't typically mutated. We
// deliberately exclude `globalThis`, `window`, `self`, `top`, `parent`, and
// `document` — those are mutable and `globalThis.appState = ...` is a real
// "global state mutation" antipattern that other rules want to catch.
// Read-only namespaces (Math, JSON, …) and library singletons are safe to
// exempt because their property access is idempotent.
const NEVER_NULL_GLOBALS = new Set<string>([
  // Read-only Node/V8 magics
  'console', 'process', 'Buffer', '__dirname', '__filename', 'module', 'exports', 'require',
  'navigator', 'location', 'history',
  // Built-in objects (read-only namespaces)
  'Math', 'JSON', 'Object', 'Array', 'Number', 'String', 'Boolean', 'Date',
  'RegExp', 'Promise', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Proxy', 'Reflect', 'Intl', 'BigInt', 'WebAssembly', 'Atomics',
  'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder',
  'AbortController', 'AbortSignal', 'EventTarget', 'Event', 'CustomEvent',
  'FormData', 'Blob', 'File', 'FileReader', 'Headers', 'Request', 'Response',
  // Error classes
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'URIError',
  'EvalError', 'ReferenceError', 'AggregateError',
  // Common library / framework names
  'fetch', 'crypto', 'performance', 'queueMicrotask',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'setImmediate', 'clearImmediate', 'requestAnimationFrame', 'cancelAnimationFrame',
  // Common loggers (used as singletons)
  'logger', 'log', 'winston', 'pino', 'bunyan',
]);

/**
 * Returns true if the identifier resolves to:
 *   - A NEVER_NULL_GLOBALS entry (built-in / known singleton)
 *   - A catch-clause parameter (`catch (e) { e.message }` — never null)
 *   - A variable initialized by `new X(...)` (constructor result is never null)
 *   - A top-level import (`import x from 'y'` — never null)
 *
 * For these, the rule should not demand a null check.
 */
function isProvablyNonNullableIdentifier(
  ident: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (NEVER_NULL_GLOBALS.has(ident.name)) return true;

  // Walk scope chain to find the resolved variable
  let s: TSESLint.Scope.Scope | null = scope;
  while (s) {
    const variable = s.variables.find((v) => v.name === ident.name);
    if (variable) {
      for (const def of variable.defs) {
        // catch (e) { ... }
        if (def.type === 'CatchClause') return true;
        // import x from 'y' / import { x } from 'y'
        if (def.type === 'ImportBinding') return true;
        // const x = new Foo(...)
        if (def.type === 'Variable' && def.node?.type === 'VariableDeclarator') {
          const init = (def.node as TSESTree.VariableDeclarator).init;
          if (init?.type === 'NewExpression') return true;
        }
        // function f(...) — function declaration name is never null
        if (def.type === 'FunctionName') return true;
      }
      return false;
    }
    s = s.upper;
  }
  return false;
}

/**
 * Check if property access has null/undefined check
 */
function hasNullCheck(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Check if node itself uses optional chaining
  if (node.optional) {
    return true;
  }

  // Check if parent is optional chaining
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  if (parent && parent.type === 'ChainExpression') {
    return true; // Optional chaining handles null/undefined
  }

  // Check if used with nullish coalescing
  if (usesNullishCoalescing(node)) {
    return true;
  }

  // Check for basic explicit null checks in if statements
  // This is a simplified check that looks for patterns like:
  // if (obj !== null) { obj.property; }
  if (hasExplicitNullCheck(node, sourceCode)) {
    return true;
  }

  // For more sophisticated null checking, we'd need control flow analysis
  // This is a simplified implementation that checks for basic patterns

  return false;
}

/**
 * Check for explicit null checks in if statements
 */
function hasExplicitNullCheck(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Walk up the AST to find if statements
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node })
      .parent;

    if (parent && parent.type === 'IfStatement') {
      // Check if the test condition contains a null check for our object
      const test = parent.test;
      if (isNullCheckForObject(test, node.object, sourceCode)) {
        return true;
      }
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

/**
 * Check if a test expression is a null check for a specific object
 */
function isNullCheckForObject(
  test: TSESTree.Expression,
  object: TSESTree.Expression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Handle binary expressions like obj !== null
  if (test.type === 'BinaryExpression') {
    const { left, right, operator } = test;
    if (
      operator === '!==' ||
      operator === '!=' ||
      operator === '===' ||
      operator === '=='
    ) {
      const leftText = sourceCode.getText(left);
      const rightText = sourceCode.getText(right);
      const objectText = sourceCode.getText(object);

      // Check if one side matches our object and the other is null/undefined
      if (
        (leftText === objectText &&
          (rightText === 'null' || rightText === 'undefined')) ||
        (rightText === objectText &&
          (leftText === 'null' || leftText === 'undefined'))
      ) {
        return true;
      }
    }
  }

  // Handle logical expressions like obj !== null && obj !== undefined
  if (test.type === 'LogicalExpression') {
    return (
      isNullCheckForObject(test.left, object, sourceCode) ||
      isNullCheckForObject(test.right, object, sourceCode)
    );
  }

  return false;
}

/**
 * Check if expression uses nullish coalescing
 */
function usesNullishCoalescing(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 5;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node })
      .parent;

    if (
      parent &&
      parent.type === 'LogicalExpression' &&
      parent.operator === '??'
    ) {
      return true;
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

export const noMissingNullChecks = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-null-checks',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects potential null pointer dereferences',
    },
    hasSuggestions: true,
    messages: {
      missingNullCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing null check',
        cwe: 'CWE-476',
        description: 'Potential null/undefined dereference detected',
        severity: 'HIGH',
        fix: 'Use optional chaining (?.) or add explicit null check',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-2259/',
      }),
      useOptionalChaining: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Optional Chaining',
        description: 'Use optional chaining operator',
        severity: 'LOW',
        fix: 'obj?.property?.method()',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
      }),
      useNullishCoalescing: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Nullish Coalescing',
        description: 'Use nullish coalescing operator',
        severity: 'LOW',
        fix: 'value ?? defaultValue',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing',
      }),
      addExplicitCheck: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Explicit Check',
        description: 'Add explicit null check',
        severity: 'LOW',
        fix: 'if (obj !== null) { obj.property }',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/null',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
          requireExplicitChecks: {
            type: 'boolean',
            default: false,
            description: 'Require explicit null checks',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      requireExplicitChecks: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      ignoreInTests = true,
      // requireExplicitChecks = false, // Not used
    }: Options = options || {};

    const filename = context.getFilename();
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.sourceCode;

    // Track reported MemberExpression nodes to prevent duplicate reports
    // Key format: "start-end" from node.range
    const reportedMemberExpressions = new Set<string>();

    /**
     * Get a unique key for a MemberExpression node to track if it's been reported
     */
    function getMemberExpressionKey(node: TSESTree.MemberExpression): string {
      // Use the node's range for a unique identifier
      // Range is [start, end] character positions in the source
      if (node.range && Array.isArray(node.range) && node.range.length >= 2) {
        return `me-${node.range[0]}-${node.range[1]}`;
      }
      // Fallback: use location if range is not available
      const loc = (node as TSESTree.Node & { loc?: TSESTree.SourceLocation })
        .loc;
      if (loc && loc.start) {
        return `me-${loc.start.line}-${loc.start.column}-${loc.end?.line || loc.start.line}-${loc.end?.column || loc.start.column}`;
      }
      // Last resort: use a hash of the node structure
      return `me-${JSON.stringify(node).slice(0, 50)}`;
    }

    /**
     * Check member expressions for null safety
     */
    function checkMemberExpression(node: TSESTree.MemberExpression) {
      // Skip if already using optional chaining
      if (node.optional) {
        return;
      }

      // Skip if parent is optional chaining
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (parent && parent.type === 'ChainExpression') {
        return;
      }

      // Only report on the "deepest" member expression in a chain
      // If this member expression is the object of another member expression,
      // don't report it yet - let the deepest one be reported
      if (
        parent &&
        parent.type === 'MemberExpression' &&
        parent.object === node
      ) {
        return; // This is an intermediate member expression
      }

      // Check if object might be null/undefined
      // Check for Identifier or nested MemberExpression
      const objectNode = node.object;
      let shouldCheck = false;

      if (objectNode.type === 'Identifier') {
        // Skip identifiers that resolve to globals, catch params, imports,
        // function declarations, or `new X()` results — these are never null.
        if (isProvablyNonNullableIdentifier(objectNode as TSESTree.Identifier, sourceCode.getScope(node))) {
          return;
        }
        shouldCheck = true;
      } else if (objectNode.type === 'MemberExpression') {
        // Nested member expressions like value.nested.deep — only fire on
        // the deepest, where the leaf identifier matters most. Skip if the
        // base of the chain is a known-non-null global (`console.log`,
        // `JSON.stringify`, etc.).
        let base: TSESTree.Node = objectNode;
        while (base.type === 'MemberExpression') {
          base = (base as TSESTree.MemberExpression).object;
        }
        if (
          base.type === 'Identifier' &&
          isProvablyNonNullableIdentifier(base as TSESTree.Identifier, sourceCode.getScope(node))
        ) {
          return;
        }
        shouldCheck = true;
      }

      if (shouldCheck && !hasNullCheck(node, sourceCode)) {
        const nodeKey = getMemberExpressionKey(node);
        if (reportedMemberExpressions.has(nodeKey)) {
          return; // Already reported
        }

        try {
          reportedMemberExpressions.add(nodeKey);
          context.report({
            node,
            messageId: 'missingNullCheck',
            suggest: [
              {
                messageId: 'useOptionalChaining',
                fix: () => null,
              },
              {
                messageId: 'useNullishCoalescing',
                fix: () => null,
              },
              {
                messageId: 'addExplicitCheck',
                fix: () => null,
              },
            ],
          });
          /* c8 ignore next 4 -- defensive error handling, hard to trigger in tests */
        } catch {
          // Silently skip if there's an error
          return;
        }
      }
    }

    /**
     * Check call expressions for null safety (e.g., obj.method())
     * Only check if it's an actual method call, not just a property access
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      /* c8 ignore next 4 -- defensive type check, always true when called by ESLint visitor */
      // Ensure this is actually a CallExpression (not just a MemberExpression)
      if (node.type !== 'CallExpression') {
        return;
      }

      // Only check if callee is a member expression (e.g., obj.method())
      // This ensures we only check method calls, not property accesses
      if (node.callee.type === 'MemberExpression') {
        const memberExpr = node.callee;

        // Skip if already using optional chaining
        if (memberExpr.optional) {
          return;
        }

        // Skip if parent is optional chaining
        const parent = (
          memberExpr as TSESTree.Node & { parent?: TSESTree.Node }
        ).parent;
        if (parent && parent.type === 'ChainExpression') {
          return;
        }

        // Skip if this MemberExpression was already reported by checkMemberExpression
        // We can't easily check this, so we'll rely on the fact that CallExpression
        // is only triggered for actual method calls, not property accesses

        // Check if object might be null/undefined
        const objectNode = memberExpr.object;
        let shouldCheck = false;

        if (objectNode.type === 'Identifier') {
          if (isProvablyNonNullableIdentifier(objectNode as TSESTree.Identifier, sourceCode.getScope(memberExpr))) {
            return;
          }
          shouldCheck = true;
        } else if (objectNode.type === 'MemberExpression') {
          let base: TSESTree.Node = objectNode;
          while (base.type === 'MemberExpression') {
            base = (base as TSESTree.MemberExpression).object;
          }
          if (
            base.type === 'Identifier' &&
            isProvablyNonNullableIdentifier(base as TSESTree.Identifier, sourceCode.getScope(memberExpr))
          ) {
            return;
          }
          shouldCheck = true;
        }

        if (shouldCheck && !hasNullCheck(memberExpr, sourceCode)) {
          const nodeKey = getMemberExpressionKey(memberExpr);
          if (reportedMemberExpressions.has(nodeKey)) {
            return; // Already reported by checkMemberExpression
          }

          try {
            reportedMemberExpressions.add(nodeKey);
            context.report({
              node: memberExpr,
              messageId: 'missingNullCheck',
              suggest: [
                {
                  messageId: 'useOptionalChaining',
                  fix: () => null,
                },
                {
                  messageId: 'useNullishCoalescing',
                  fix: () => null,
                },
                {
                  messageId: 'addExplicitCheck',
                  fix: () => null,
                },
              ],
            });
            /* c8 ignore next 4 -- defensive error handling, hard to trigger in tests */
          } catch {
            // Silently skip if there's an error
            return;
          }
        }
      }
    }

    return {
      MemberExpression: checkMemberExpression,
      CallExpression: checkCallExpression,
    };
  },
});
