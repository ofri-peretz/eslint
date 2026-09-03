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
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'unhandledPromise' | 'addCatch' | 'useTryCatch' | 'useAwait';

export interface Options {
  /** Ignore promises in test files. Default: true */
  ignoreInTests?: boolean;

  /**
   * Report only calls the file itself shows to be promise-producing. Default: true.
   *
   * Set `false` to restore the denylist-only behaviour, which produced 4,805
   * findings across 200 files of excalidraw.
   */
  requirePromiseEvidence?: boolean;

  /**
   * Names that return a promise and cannot be resolved from the file.
   * Default: `['fetch']`.
   */
  promiseReturning?: readonly string[];

  /** Ignore promises in void expressions. Default: false */
  ignoreVoidExpressions?: boolean;
}

type RuleOptions = [Options?];

/**
 * Built-in / library calls that are KNOWN to NOT return a promise.
 *
 * A DENYLIST, and that is the defect: it has to enumerate every synchronous
 * function in the world, and everything it has not heard of is treated as a
 * promise. Measured over 200 TypeScript files of excalidraw this rule produced
 * 4,805 findings — on `useDocusaurusContext()`, `clsx("col")`,
 * `require("./tree.svg")` and `dynamic(...)`, none of which is in the list
 * below and none of which is a promise.
 *
 * The list is kept because it is still a cheap first filter, but the decision
 * now belongs to `hasPromiseEvidence` below, which asks the opposite question:
 * does the FILE show this call to produce a promise?
 */
const NEVER_RETURNS_PROMISE_FUNCTIONS = new Set<string>([
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'queueMicrotask',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'BigInt',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'Array',
  'Object',
]);

const NEVER_RETURNS_PROMISE_METHODS = new Set<string>([
  // console / logger
  'log',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'group',
  'groupEnd',
  'time',
  'timeEnd',
  'assert',
  // Math
  'floor',
  'ceil',
  'round',
  'abs',
  'min',
  'max',
  'pow',
  'sqrt',
  'random',
  'sin',
  'cos',
  'tan',
  'log2',
  'log10',
  // String / Array helpers
  'slice',
  'split',
  'join',
  'concat',
  'includes',
  'indexOf',
  'lastIndexOf',
  'startsWith',
  'endsWith',
  'replace',
  'replaceAll',
  'trim',
  'toLowerCase',
  'toUpperCase',
  'repeat',
  'padStart',
  'padEnd',
  'charAt',
  'charCodeAt',
  'codePointAt',
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'reverse',
  'sort',
  'map',
  'filter',
  'reduce',
  'reduceRight',
  'forEach',
  'every',
  'some',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'fill',
  'copyWithin',
  'entries',
  'keys',
  'values',
  // JSON
  'parse',
  'stringify',
  // AbortController/AbortSignal
  'abort',
  'addEventListener',
  'removeEventListener',
  'dispatchEvent',
  // Date / Buffer / Number / Array static helpers (sync)
  'now',
  'parse',
  'UTC',
  'from',
  'of',
  'isArray',
  'isBuffer',
  'isInteger',
  'isFinite',
  'isNaN',
  'isSafeInteger',
  'fromCharCode',
  'fromCodePoint',
  'raw',
  // Object helpers (sync)
  'assign',
  'freeze',
  'isFrozen',
  'create',
  'defineProperty',
  'defineProperties',
  'getOwnPropertyDescriptor',
  'getOwnPropertyNames',
  'getPrototypeOf',
  'setPrototypeOf',
  'preventExtensions',
  'isExtensible',
  'seal',
  'isSealed',
  'fromEntries',
  // Promise constructors that are themselves a promise but the callee is OK
]);

/**
 * Globals whose methods are conventionally synchronous (no method on these
 * namespaces returns a Promise in the standard library). Used in addition
 * to `NEVER_RETURNS_PROMISE_METHODS` because matching by method name alone
 * is too coarse: `from` is sync on `Array`/`Buffer`/`Date` but could be
 * async on a user-defined object.
 */
const SYNC_NAMESPACE_OBJECTS = new Set<string>([
  'Math',
  'JSON',
  'Date',
  'Buffer',
  'Array',
  'Object',
  'Number',
  'String',
  'Boolean',
  'Symbol',
  'BigInt',
  'Reflect',
  'console',
  'process',
]);

/**
 * Returns true if the call MIGHT return a Promise (default — we want to
 * preserve detection for unknown calls). Returns false only when the
 * callee is a known synchronous built-in (`setTimeout`, `console.log`,
 * `Math.floor`, etc.) — those structurally never return promises and
 * firing on them produces FPs. Keeping the default as "could be a
 * promise" preserves recall on user-defined async functions.
 *
 * Exported for direct Layer-2 unit testing: the non-CallExpression early
 * return is only reachable when called with a non-call node (kept for the
 * future `checkIdentifier` listener), which the current CallExpression-only
 * listener never produces.
 */
/**
 * Does the FILE show this call to produce a promise?
 *
 * The four shapes a reader can verify from the source in front of them:
 *
 *   new Promise(…)              the constructor
 *   Promise.all / resolve / …   the statics
 *   x.then(…)                   the thenable protocol — the name IS the evidence
 *   f() where `async function f` or `const f = async () => …` is in scope
 *
 * plus any name the consumer configures in `promiseReturning`, because a rule
 * that decides from a name has to let the consumer own the name.
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
  // No `Import` branch: `import(x)` parses as an `ImportExpression`, not a
  // `CallExpression`, so this function is never called with one. A branch that
  // cannot be reached is not caution, it is a claim the tests cannot check —
  // the miss is recorded as an `FN:` case instead.

  // An immediately-invoked async function. The callee is the declaration, so
  // the evidence is right there with no scope lookup at all.
  if (isAsyncFunctionNode(node.callee)) return true;

  if (node.callee.type === 'MemberExpression') {
    const { object } = node.callee;
    if (
      object.type === 'Identifier' &&
      object.name === 'Promise' &&
      // `Promise['all']([…])` is the same static `Promise.all` is.
      namesOneOf(propertyName(node.callee), PROMISE_STATICS)
    ) {
      return true;
    }
    // `x.then(…)` and `x["then"](…)` are the same protocol; the second form
    // appears in minified and generated code, and reading only the Identifier
    // spelling meant the rule saw a promise in one and not the other.
    // Named `member`, not `propertyName`: a local of that name shadows the
    // imported helper, and the shadow only surfaces where something calls it.
    const member = propertyName(node.callee);
    if (member === 'then') return true;
    return object.type === 'Identifier' && promiseReturning.has(object.name);
  }

  if (node.callee.type === 'Identifier') {
    if (promiseReturning.has(node.callee.name)) return true;
    return isAsyncFunctionNode(resolveBinding(node.callee.name));
  }

  return false;
}

export function isLikelyPromiseExpression(node: TSESTree.Node): boolean {
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
      if (NEVER_RETURNS_PROMISE_METHODS.has((prop as TSESTree.Identifier).name))
        return false;
    }
    // Static helpers on known sync namespaces — `Buffer.from`, `Date.now`,
    // `Array.isArray`, `Object.keys`, etc. The standard library never
    // returns a Promise from any method on these globals.
    const obj = (callee as TSESTree.MemberExpression).object;
    if (
      obj.type === 'Identifier' &&
      SYNC_NAMESPACE_OBJECTS.has((obj as TSESTree.Identifier).name)
    ) {
      return false;
    }
    return true;
  }

  return true;
}

/**
 * Returns true when the call's parent indicates the promise is delegated
 * to a caller and therefore not "unhandled" at this site. This covers:
 *   - `return fn()` — the enclosing function returns the promise; its
 *     caller takes responsibility.
 *   - `() => fn()` — concise-body arrow returns the promise.
 *   - `.then(() => fn())` — already inside a promise chain (handled by
 *     `isInsidePromiseCallback`, but the arrow-body case is the same).
 */
function isPromiseDelegatedToCaller(node: TSESTree.CallExpression): boolean {
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  if (!parent) return false;
  if (parent.type === 'ReturnStatement') return true;
  if (
    parent.type === 'ArrowFunctionExpression' &&
    (parent as TSESTree.ArrowFunctionExpression).body === node
  )
    return true;
  return false;
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
        // `p['then'](…)` settles the promise exactly as `p.then(…)` does.
        const settled = propertyName(memberExpr);
        if (settled !== null) {
          const methodName = settled;
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
 *
 * Exported for direct Layer-2 unit testing: the Identifier branch is only
 * reachable when called with an Identifier node (kept for the future
 * `checkIdentifier` listener), which the current CallExpression-only
 * listener never produces.
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
          requirePromiseEvidence: {
            type: 'boolean',
            default: true,
            description:
              'Report only calls the file itself shows to be promise-producing.',
          },
          promiseReturning: {
            type: 'array',
            items: { type: 'string' },
            default: ['fetch'],
            description:
              'Names that return a promise and cannot be resolved from the file.',
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
    const {
      ignoreInTests = true,
      ignoreVoidExpressions = false,
      requirePromiseEvidence = true,
      promiseReturning = ['fetch'],
    }: Options = options || {};
    const promiseNames = new Set(promiseReturning);

    /**
     * Resolve an identifier to the function it is bound to. Only a binding
     * whose initialiser is visible in this file counts — an imported name
     * resolves to an ImportSpecifier, which says nothing about what it
     * returns, and is correctly not evidence.
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

      // `return fn()` / `() => fn()` — the promise is delegated to the
      // caller. Flagging here would force `await` everywhere a promise
      // is forwarded, which is wrong: forwarding IS handling.
      if (isPromiseDelegatedToCaller(node)) {
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
         * Including `then` here meant `fetch(url).then(r => r.json())` returned
         * before the handled-check could look further along for a `.catch` — so
         * the rule passed the exact shape it exists to catch, while reporting
         * `require("./tree.svg")`.
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
      if (!isLikelyPromiseExpression(node)) {
        return;
      }

      // The denylist above says what is definitely NOT a promise; this asks
      // whether the file shows anything that IS one.
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
        // All three, unlike the maintainability twin where `.catch`/`.finally`
        // are unreachable here because its handled-check returns first. The
        // two rules reached the same behaviour by different routes, and the
        // difference is real: trimming these arms fails two cases in this
        // plugin and none in that one.
        const inPromiseChain =
          chainOn !== null &&
          chainOn.property.type === 'Identifier' &&
          (outerChainMethod === 'then' ||
            outerChainMethod === 'catch' ||
            outerChainMethod === 'finally');
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
      if (!isLikelyPromiseExpression(node)) {
        return;
      }

      if (
        requirePromiseEvidence &&
        !hasPromiseEvidence(node, promiseNames, (name) => resolveBinding(name, node))
      ) {
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
