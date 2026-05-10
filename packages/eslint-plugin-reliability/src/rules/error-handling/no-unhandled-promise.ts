/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unhandled-promise
 * Detects unhandled Promise rejections
 * CWE-1024: Comparison of Classes by Name
 *
 * @see https://cwe.mitre.org/data/definitions/1024.html
 * @see https://rules.sonarsource.com/javascript/RSPEC-4635/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'unhandledPromise' | 'addCatch' | 'useTryCatch' | 'useAwait';

export interface Options {
  /** Ignore promises in test files. Default: true */
  ignoreInTests?: boolean;

  /** Ignore promises in void expressions. Default: false */
  ignoreVoidExpressions?: boolean;
}

type RuleOptions = [Options?];

/**
 * Built-in / library calls that are KNOWN to NOT return a promise. Firing
 * on these produces FPs (e.g., `setTimeout(...)`, `console.log(...)`,
 * `Math.floor(...)` are not unhandled promises).
 */
const NEVER_RETURNS_PROMISE_FUNCTIONS = new Set<string>([
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'setImmediate', 'clearImmediate',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'queueMicrotask',
  'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'Array', 'Object',
]);

const NEVER_RETURNS_PROMISE_METHODS = new Set<string>([
  // console / logger
  'log', 'error', 'warn', 'info', 'debug', 'trace', 'group', 'groupEnd',
  'time', 'timeEnd', 'assert',
  // Math
  'floor', 'ceil', 'round', 'abs', 'min', 'max', 'pow', 'sqrt', 'random',
  'sin', 'cos', 'tan', 'log2', 'log10',
  // String / Array helpers
  'slice', 'split', 'join', 'concat', 'includes', 'indexOf', 'lastIndexOf',
  'startsWith', 'endsWith', 'replace', 'replaceAll', 'trim', 'toLowerCase', 'toUpperCase',
  'repeat', 'padStart', 'padEnd', 'charAt', 'charCodeAt', 'codePointAt',
  'push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort',
  'map', 'filter', 'reduce', 'reduceRight', 'forEach', 'every', 'some', 'find', 'findIndex',
  'flat', 'flatMap', 'fill', 'copyWithin', 'entries', 'keys', 'values',
  // JSON
  'parse', 'stringify',
  // AbortController/AbortSignal
  'abort', 'addEventListener', 'removeEventListener', 'dispatchEvent',
  // Promise constructors that are themselves a promise but the callee is OK
]);

/**
 * Returns true if the call MIGHT return a Promise (default — we want to
 * preserve detection for unknown calls). Returns false only when the
 * callee is a known synchronous built-in (`setTimeout`, `console.log`,
 * `Math.floor`, etc.) — those structurally never return promises and
 * firing on them produces FPs. Keeping the default as "could be a
 * promise" preserves recall on user-defined async functions.
 */
function isLikelyPromiseExpression(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') return false;
  const callee = (node as TSESTree.CallExpression).callee;

  // Direct calls — skip known synchronous built-ins
  if (callee.type === 'Identifier') {
    const name = (callee as TSESTree.Identifier).name;
    if (NEVER_RETURNS_PROMISE_FUNCTIONS.has(name)) return false;
    return true;
  }

  // Method calls — skip known synchronous methods (Math.*, Array.*,
  // String.*, console.*, JSON.*)
  if (callee.type === 'MemberExpression') {
    const prop = (callee as TSESTree.MemberExpression).property;
    if (prop.type === 'Identifier') {
      if (NEVER_RETURNS_PROMISE_METHODS.has((prop as TSESTree.Identifier).name)) return false;
    }
    return true;
  }

  return true;
}

/**
 * Check if a CallExpression is inside a promise chain callback
 */
function isInsidePromiseCallback(node: TSESTree.CallExpression): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node })
      .parent;

    if (!parent) break;

    // Check if we're inside an arrow function or function expression
    if (
      parent.type === 'ArrowFunctionExpression' ||
      parent.type === 'FunctionExpression'
    ) {
      // Check if this function is an argument to a promise method (.then, .catch, .finally)
      const funcParent = (parent as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (
        funcParent &&
        funcParent.type === 'CallExpression' &&
        funcParent.callee &&
        funcParent.callee.type === 'MemberExpression'
      ) {
        const memberExpr = funcParent.callee;
        if (memberExpr.property.type === 'Identifier') {
          const methodName = memberExpr.property.name;
          if (
            methodName === 'then' ||
            methodName === 'catch' ||
            methodName === 'finally'
          ) {
            // We're inside a promise chain callback
            return true;
          }
        }
      }
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

/**
 * Check if promise is handled (has .catch, .then, or is in try/catch)
 */
function isPromiseHandled(node: TSESTree.Node): boolean {
  // For identifiers, check if they're used in a promise chain
  if (node.type === 'Identifier') {
    const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    if (
      parent &&
      parent.type === 'MemberExpression' &&
      parent.object === node
    ) {
      if (parent.property.type === 'Identifier') {
        const methodName = parent.property.name;
        if (
          methodName === 'catch' ||
          methodName === 'then' ||
          methodName === 'finally'
        ) {
          // Check if this MemberExpression is used as a callee (called)
          const memberParent = (
            parent as TSESTree.Node & { parent?: TSESTree.Node }
          ).parent;
          if (
            memberParent &&
            memberParent.type === 'CallExpression' &&
            memberParent.callee === parent
          ) {
            // Promise is handled by .then(), .catch(), or .finally()
            return true;
          }
        }
      }
    }
  }

  // For CallExpressions, traverse up the AST to find if this promise is part of a handled chain
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node })
      .parent;

    if (!parent) break;

    // Check if parent is a MemberExpression with .catch/.then/.finally
    if (parent.type === 'MemberExpression' && parent.object === current) {
      if (parent.property.type === 'Identifier') {
        const methodName = parent.property.name;
        if (
          methodName === 'catch' ||
          methodName === 'then' ||
          methodName === 'finally'
        ) {
          // Check if this MemberExpression is used as a callee (called)
          const memberParent = (
            parent as TSESTree.Node & { parent?: TSESTree.Node }
          ).parent;
          if (
            memberParent &&
            memberParent.type === 'CallExpression' &&
            memberParent.callee === parent
          ) {
            // Promise is handled by .then(), .catch(), or .finally()
            return true;
          }
        }
      }
    }

    // Check if in try/catch block
    if (parent.type === 'TryStatement') {
      return true;
    }

    // Check if in await expression
    if (parent.type === 'AwaitExpression') {
      return true;
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

export const noUnhandledPromise = createRule<RuleOptions, MessageIds>({
  name: 'no-unhandled-promise',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-unhandled-promise.md',
      description: 'Detects unhandled Promise rejections',
      cwe: 'CWE-1024',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      unhandledPromise: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unhandled promise',
        cwe: 'CWE-1024',
        description: 'Unhandled Promise rejection detected',
        severity: 'HIGH',
        fix: 'Add .catch() handler or use try/catch with await',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-4635/',
      }),
      addCatch: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add catch handler',
        description: 'Add .catch() handler to promise',
        severity: 'LOW',
        fix: 'promise.catch(error => console.error(error))',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch',
      }),
      useTryCatch: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use try/catch',
        description: 'Use try/catch with await',
        severity: 'LOW',
        fix: 'try { await promise; } catch (error) { handle(error); }',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch',
      }),
      useAwait: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use await',
        description: 'Use await to handle promise',
        severity: 'LOW',
        fix: 'await promise;',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore promises in test files',
          },
          ignoreVoidExpressions: {
            type: 'boolean',
            default: false,
            description: 'Ignore promises in void expressions',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      ignoreVoidExpressions: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { ignoreInTests = true, ignoreVoidExpressions = false }: Options =
      options || {};

    const filename = context.getFilename();
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    // const sourceCode = context.sourceCode || context.sourceCode; // Not used

    /**
     * Check call expressions for unhandled promises
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Skip CallExpressions that are inside promise chain callbacks
      if (isInsidePromiseCallback(node)) {
        return;
      }

      // Skip calls to promise methods (.then, .catch, .finally) as they are handled by definition
      // But only if they have meaningful callbacks
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier'
      ) {
        const methodName = node.callee.property.name;
        if (
          methodName === 'then' ||
          methodName === 'catch' ||
          methodName === 'finally'
        ) {
          // Check if the callback is empty or meaningless
          if (
            node.arguments.length > 0 &&
            node.arguments[0].type === 'ArrowFunctionExpression'
          ) {
            const callback = node.arguments[0];
            if (
              callback.body.type === 'BlockStatement' &&
              callback.body.body.length === 0
            ) {
              // Empty callback - don't skip, this should be flagged
            } else {
              return; // Has meaningful callback, skip
            }
          } else {
            return; // Not an arrow function callback, assume it's handled
          }
        }
      }

      // Check if it's a promise-returning function
      if (!isLikelyPromiseExpression(node)) {
        return;
      }

      // Check if it's already handled
      if (isPromiseHandled(node)) {
        return;
      }

      // Check if it's in a void expression
      if (ignoreVoidExpressions) {
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
          .parent;
        if (
          parent &&
          parent.type === 'UnaryExpression' &&
          parent.operator === 'void'
        ) {
          return;
        }
      }

      // Skip if this CallExpression is an argument to another CallExpression
      // (e.g., console.log(fetch(url)) - we don't want to flag fetch(url) here)
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (parent && parent.type === 'CallExpression') {
        // Only skip if it's not part of a promise chain
        // If it's the object of a MemberExpression with .then/.catch/.finally, it's a promise
        const grandParent = (
          parent as TSESTree.Node & { parent?: TSESTree.Node }
        ).parent;
        if (
          !(
            grandParent &&
            grandParent.type === 'MemberExpression' &&
            grandParent.object === parent &&
            grandParent.property.type === 'Identifier' &&
            (grandParent.property.name === 'then' ||
              grandParent.property.name === 'catch' ||
              grandParent.property.name === 'finally')
          )
        ) {
          return;
        }
      }

      context.report({
        node,
        messageId: 'unhandledPromise',
        suggest: [
          {
            messageId: 'addCatch',
            fix: () => null, // Cannot auto-fix without context
          },
          {
            messageId: 'useTryCatch',
            fix: () => null,
          },
          {
            messageId: 'useAwait',
            fix: () => null,
          },
        ],
      });
    }

    /**
     * Check identifier expressions for unhandled promises
     * Note: Currently unused, keeping for future implementation
     */
    /*
    function checkIdentifier(node: TSESTree.Identifier) {
      // Skip identifiers that are inside promise chain callbacks
      if (isInsidePromiseCallback({ type: 'CallExpression', callee: node, arguments: [], optional: false } as TSESTree.CallExpression)) {
        return;
      }

      // Check if it's a promise-like identifier
      if (!isLikelyPromiseExpression(node)) {
        return;
      }

      // Check if it's already handled
      if (isPromiseHandled(node)) {
        return;
      }

      // Check if it's in a void expression
      if (ignoreVoidExpressions) {
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (parent && parent.type === 'UnaryExpression' && parent.operator === 'void') {
          return;
        }
      }

      context.report({
        node,
        messageId: 'unhandledPromise',
        suggest: [
          {
            messageId: 'addCatch',
            fix: () => null,
          },
          {
            messageId: 'useTryCatch',
            fix: () => null,
          },
          {
            messageId: 'useAwait',
            fix: () => null,
          },
        ],
      });
    }
    */

    return {
      CallExpression: checkCallExpression,
    };
  },
});
