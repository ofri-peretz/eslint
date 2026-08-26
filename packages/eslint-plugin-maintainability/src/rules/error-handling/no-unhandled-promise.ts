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
import {
  formatLLMMessage,
  MessageIcons,
  staticString,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'unhandledPromise' | 'addCatch' | 'useTryCatch' | 'useAwait';

export interface Options {
  /** Ignore promises in test files. Default: true */
  ignoreInTests?: boolean;

  /** Ignore promises in void expressions. Default: false */
  ignoreVoidExpressions?: boolean;

  /**
   * Report only calls the file itself shows to be promise-producing. Default: true.
   *
   * Set `false` to restore the pre-2026-08 behaviour, in which every
   * `CallExpression` was treated as a promise. That is what the rule did, and
   * it is not a conservative default — measured over 200 TypeScript files of
   * excalidraw it produced 7,061 findings, 35 per file, on lines like
   * `<div className={clsx("col")} />` and `require("./tree.svg")`.
   */
  requirePromiseEvidence?: boolean;

  /**
   * Names that return a promise and cannot be resolved from the file — platform
   * APIs and the project's own conventions. Default: `['fetch']`.
   *
   * A list rather than a built-in vocabulary, because a rule that decides from
   * a name has to let the consumer own that name. `fetch` is the default
   * because it is the one promise-returning global that appears in every
   * runtime this suite targets; `axios`, `got`, `prisma` and the rest belong to
   * whoever uses them.
   */
  promiseReturning?: readonly string[];
}

type RuleOptions = [Options?];

/**
 * Check if a node is a Promise-like expression
 * For now, we check all CallExpressions since we can't statically determine
 * which functions return promises. The isPromiseHandled function will filter out
 * non-promise calls that are inside handled promise chains.
 */
export function isPromiseExpression(node: TSESTree.Node): boolean {
  // Function calls that might return promises
  if (node.type === 'CallExpression') {
    return true;
  }

  // Await expressions (already handled)
  if (node.type === 'AwaitExpression') {
    return false; // Already handled
  }

  return false;
}

/**
 * Does the FILE show this call to produce a promise?
 *
 * Without type information the honest answer for most calls is "unknown", and
 * the rule used to resolve unknown as yes. This resolves it as no, and reports
 * only the four shapes a reader can verify from the source in front of them:
 *
 *   new Promise(…)              the constructor
 *   Promise.all / resolve / …   the statics
 *   import("…")                 always a promise
 *   f() where `async function f` or `const f = async () => …` is in scope
 *
 * A `.then()` chain is handled separately by the caller, which already knows
 * whether a `.catch` follows.
 *
 * The cost is real and is the point of `requirePromiseEvidence`: a promise
 * returned by an imported function is invisible here, so this misses it. A
 * miss the rule can explain is worth more than 35 findings a file that nobody
 * reads.
 */
const PROMISE_STATICS: ReadonlySet<string> = new Set([
  'all',
  'allSettled',
  'any',
  'race',
  'resolve',
  'reject',
]);

function isAsyncFunctionNode(node: TSESTree.Node | undefined | null): boolean {
  if (!node) return false;
  return (
    (node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression') &&
    node.async === true
  );
}

export function hasPromiseEvidence(
  node: TSESTree.CallExpression,
  promiseReturning: ReadonlySet<string>,
  resolveBinding: (name: string) => TSESTree.Node | null,
): boolean {
  // No `NewExpression` branch: the rule listens for `CallExpression` only, so
  // this function is never called with one. A branch that cannot be reached is
  // not caution, it is a claim the tests cannot check — the miss is recorded as
  // an `FN:` case instead.

  // `import("…")` — the only call form that is a promise by grammar.
  // No `Import` branch: `import(x)` parses as an `ImportExpression`, not a
  // `CallExpression`, so this function is never called with one. A branch that
  // cannot be reached is not caution, it is a claim the tests cannot check —
  // the miss is recorded as an `FN:` case instead.

  // An immediately-invoked async function. The callee is the declaration, so
  // the evidence is right there with no scope lookup at all.
  if (isAsyncFunctionNode(node.callee)) return true;

  if (node.callee.type === 'MemberExpression') {
    const { object, property } = node.callee;
    if (
      object.type === 'Identifier' &&
      object.name === 'Promise' &&
      property.type === 'Identifier' &&
      PROMISE_STATICS.has(property.name)
    ) {
      return true;
    }
    /**
     * `.then` is the thenable protocol. A receiver that answers to it is a
     * promise as far as any caller is concerned, and this is the one member
     * call where the name IS the evidence rather than a guess about it.
     */
    // `x.then(…)` and `x["then"](…)` are the same protocol; the second form
    // appears in minified and generated code, and reading only the Identifier
    // spelling meant the rule saw a promise in one and not the other.
    const propertyName =
      property.type === 'Identifier'
        ? property.name
        : staticString(property) !== null
          ? staticString(property)
          : null;
    if (propertyName === 'then') return true;
    // `axios.get(url)` — the RECEIVER is the configured name, not the method.
    return object.type === 'Identifier' && promiseReturning.has(object.name);
  }

  if (node.callee.type === 'Identifier') {
    if (promiseReturning.has(node.callee.name)) return true;
    return isAsyncFunctionNode(resolveBinding(node.callee.name));
  }

  return false;
}

/**
 * Check if a CallExpression is inside a promise chain callback
 */
export function isInsidePromiseCallback(
  node: TSESTree.CallExpression,
): boolean {
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
export function isPromiseHandled(node: TSESTree.Node): boolean {
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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-maintainability/docs/rules/no-unhandled-promise.md',
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
          requirePromiseEvidence: {
            type: 'boolean',
            default: true,
            description:
              'Report only calls the file itself shows to be promise-producing. False restores the pre-2026-08 behaviour of treating every call as a promise.',
          },
          promiseReturning: {
            type: 'array',
            items: { type: 'string' },
            default: ['fetch'],
            description:
              'Names that return a promise and cannot be resolved from the file — platform APIs and project conventions.',
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
      requirePromiseEvidence: true,
      promiseReturning: ['fetch'],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      ignoreInTests = true,
      ignoreVoidExpressions = false,
      requirePromiseEvidence = true,
      promiseReturning = ['fetch'],
    }: Options = options || {};
    const promiseNames = new Set(promiseReturning);

    /**
     * Resolve an identifier to the function it is bound to, through the scope
     * chain. Only a binding whose initialiser is visible in this file can
     * count as evidence — an imported name resolves to an ImportSpecifier,
     * which says nothing about what it returns, and is correctly not evidence.
     */
    function resolveBinding(
      name: string,
      from: TSESTree.Node,
    ): TSESTree.Node | null {
      let scope = context.sourceCode.getScope(from);
      while (scope) {
        const variable = scope.variables.find((v) => v.name === name);
        if (variable) {
          const def = variable.defs[0];
          if (!def) return null;
          if (def.node.type === 'FunctionDeclaration') return def.node;
          if (def.node.type === 'VariableDeclarator') {
            return (def.node as TSESTree.VariableDeclarator).init ?? null;
          }
          return null;
        }
        scope = scope.upper as never;
      }
      return null;
    }

    const filename = context.filename;
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    // const sourceCode = context.sourceCode; // Not used

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
        /**
         * `.catch` and `.finally` terminate a chain; `.then` does not.
         *
         * This used to include `then`, which meant `fetch(url).then(r => r.json())`
         * returned here before `isPromiseHandled` could look for a `.catch`
         * further along — so the rule missed the exact shape it exists to
         * catch, while reporting `require("./tree.svg")`. Both directions
         * wrong, from the same block.
         */
        if (methodName === 'catch' || methodName === 'finally') {
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
      if (!isPromiseExpression(node)) {
        return;
      }

      /**
       * The gate. `isPromiseExpression` answers yes for every call — it says so
       * in its own comment — so without this the rule reports every unhandled
       * function call in the file. On excalidraw that was 35 findings per file,
       * on lines like `<div className={clsx("col")} />`.
       */
      if (
        requirePromiseEvidence &&
        !hasPromiseEvidence(node, promiseNames, (name) =>
          resolveBinding(name, node),
        )
      ) {
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

      // This call is an argument to another call.
      //
      // The skip exists so one defect produces one finding: in
      // `wrapPromise(fetch(url))` both calls are promise candidates and both
      // would report. But it was UNCONDITIONAL, and when the outer call is not
      // a promise candidate — `console.log(fetch(url))` is the everyday one —
      // nothing reported at all. The outer is not a candidate, the inner was
      // skipped, and the unhandled rejection went unmentioned. Six documented
      // misses across two plugins were this one branch.
      //
      // Deciding on the OUTER call keeps one-finding-per-defect and recovers
      // the miss: whichever of the two is a promise reports, and when both
      // are, only the outer does.
      //
      // The chain test below deliberately still reads the DOTTED spelling
      // only. Routing it through `propertyName` looks like an obvious
      // improvement and is not: it made `wrap(p)["then"](h)` report twice and
      // `wrap(p)["catch"](h)` report once, because four other sites in this
      // rule read the same property and they do not all agree yet. That is a
      // separate change with its own measurements, and `p["then"](…)` is
      // already handled by `hasPromiseEvidence`.
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (parent && parent.type === 'CallExpression') {
        const grandParent = (
          parent as TSESTree.Node & { parent?: TSESTree.Node }
        ).parent;
        // ONE lookup, two questions. The chain method is read once with
        // `propertyName`, which answers for `wrap(p)["then"]` as well as
        // `wrap(p).then`; `inPromiseChain` then keeps the DOTTED-only meaning
        // it has always had, because widening it changed four other sites in
        // this rule at once and made `wrap(p)["then"](h)` report twice.
        //
        // Testing the grandparent twice was the same question asked in two
        // shapes, and left an arm only a synthetic node could reach.
        const chainOn =
          grandParent?.type === 'MemberExpression' &&
          grandParent.object === parent
            ? grandParent
            : null;
        const outerChainMethod =
          chainOn === null ? null : propertyName(chainOn);
        // `then` only. A `.catch` or `.finally` on the wrapper means the chain
        // is HANDLED, and the handled-check above has already returned by the
        // time this runs — so arms for those two were unreachable, not merely
        // untested. Verified by coverage: both were dead.
        const inPromiseChain =
          chainOn !== null &&
          chainOn.property.type === 'Identifier' &&
          outerChainMethod === 'then';
        // `arguments.includes` and not `callee ===`: in `getPromise()(x)` this
        // call is the CALLEE, where the outer call is the promise.
        const isArgument = parent.arguments.some((a) => a === (node as never));
        // The outer call is also a promise when a chain method is called ON it,
        // in either spelling. This decides only whether to SKIP the inner call,
        // so widening it can lose a report but never add one.
        const outerIsPromise =
          outerChainMethod === 'then' ||
          outerChainMethod === 'catch' ||
          outerChainMethod === 'finally' ||
          hasPromiseEvidence(parent, promiseNames, (name) =>
            resolveBinding(name, parent),
          );
        if (!inPromiseChain && (!isArgument || outerIsPromise)) {
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
      if (!isPromiseExpression(node)) {
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

    /**
     * `new Promise(…)` and `import(…)` never reached this rule.
     *
     * It listens for `CallExpression`, and neither of those is one: `new X()`
     * parses as a `NewExpression` and `import(x)` as an `ImportExpression`.
     * Both produce a promise by grammar — there is nothing to infer — and both
     * were recorded as `FN:` cases rather than caught.
     *
     * The check is deliberately narrower than the CallExpression path. It
     * reports only when the promise is the whole statement, which is the one
     * arrangement where nobody can be using the result: not awaited, not
     * returned, not assigned, not chained. Anything else may be handled
     * somewhere this rule cannot see, and the CallExpression path already owns
     * the chains.
     */
    function checkStatementPromise(node: TSESTree.Node): void {
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (parent?.type !== 'ExpressionStatement') return;
      context.report({ node, messageId: 'unhandledPromise' });
    }

    return {
      CallExpression: checkCallExpression,
      ImportExpression: checkStatementPromise,
      NewExpression(node: TSESTree.NewExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Promise'
        ) {
          checkStatementPromise(node);
        }
      },
    };
  },
});
