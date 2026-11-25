/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unbounded-cause-recursion
 * Detects a function that calls itself on `error.cause` (or maps itself over
 * `error.errors`) with no visited set and no depth bound.
 * CWE-674: Uncontrolled Recursion
 *
 * `cause` is an ordinary property. A cycle (`e.cause = e`, two errors that cite
 * each other) is one assignment away, and the walk then throws
 * `RangeError: Maximum call stack size exceeded` from inside the code that was
 * handling the first error. Node.js issue #67572 (`assert.deepStrictEqual` on a
 * self-referencing cause) and Next.js 16.4.6 `unstable_rethrow` both have this
 * shape. Intent: docs/intents/a-cause-chain-walk-needs-a-cycle-guard.
 *
 * ## What is reported
 *
 * A function bound to a name (a declaration, a named function expression, or
 * a `const` initialised with a function) that, in its own body, calls that
 * binding with an argument reading `.cause` (directly, or through a variable
 * destructured or assigned from `.cause`), or passes the binding to an array
 * method called on `.errors` (`err.errors.map(walk)`), when the function has
 * no guard.
 *
 * ## What counts as a guard
 *
 * - A collection the function both looks up and writes: `seen.has(x)` or
 *   `seen.get(x)` and `seen.add(x)` or `seen.set(x, y)` on the same binding
 *   (a parameter, a local, or a module-level `WeakSet`), or `seen.includes(x)`
 *   and `seen.push(x)` on an array.
 * - A marker or a memo kept through helpers: a binding that the body records
 *   (as the key of a write on the walked error, `err[seen] = true`, or passed
 *   with the walked error to a call outside a condition, `mapSet(map, err,
 *   copy)`) and also tests (`seen in x`, or passed with the walked error to a
 *   call inside an `if`, `?:` or `&&` test: `if (mapHas(map, err))`,
 *   `!hasOwnProperty.call(err.cause, seen)`).
 * - A depth bound: a parameter compared with `<`, `<=`, `>` or `>=` in the
 *   body and passed on changed (`depth + 1`, `depth - 1`, `++depth`) in a
 *   recursive call. A local read from `arguments` counts as a parameter, which
 *   is how a transpiler writes a default parameter.
 *
 * A self-check such as `if (e.cause === e) return` is not a guard: two errors
 * that cite each other still overflow.
 *
 * @see https://cwe.mitre.org/data/definitions/674.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'unboundedCauseRecursion';

type RuleOptions = [];

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/**
 * @protocol-constant Array.prototype methods that call their callback once per element
 */
const ITERATING_METHODS: ReadonlySet<string> = new Set([
  'map',
  'flatMap',
  'forEach',
  'filter',
  'some',
  'every',
  'find',
  'reduce',
]);

/**
 * @protocol-constant Set/Map/WeakSet/WeakMap and Array method names that look up membership
 */
const LOOKUP_METHODS: ReadonlySet<string> = new Set(['has', 'get', 'includes']);

/**
 * @protocol-constant Set/Map/WeakSet/WeakMap and Array method names that record membership
 */
const RECORD_METHODS: ReadonlySet<string> = new Set(['add', 'set', 'push']);

/** @protocol-constant The relational operators a depth bound is checked with */
const BOUND_OPERATORS: ReadonlySet<string> = new Set(['<', '<=', '>', '>=']);

function isFunction(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** Visit every node of a function body, not entering nested functions. */
function walkOwnBody(
  fn: FunctionNode,
  visit: (node: TSESTree.Node) => void,
): void {
  const stack: TSESTree.Node[] = [fn.body];
  while (stack.length > 0) {
    const node = stack.pop() as TSESTree.Node;
    visit(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      const children = Array.isArray(value) ? value : [value];
      for (const child of children) {
        if (
          child &&
          typeof child === 'object' &&
          typeof (child as TSESTree.Node).type === 'string' &&
          !isFunction(child as TSESTree.Node)
        ) {
          stack.push(child as TSESTree.Node);
        }
      }
    }
  }
}

/** Does this expression read a `.cause` property anywhere in it? */
/** Does this expression read the function's `arguments` object? */
function readsArguments(node: TSESTree.Node): boolean {
  let found = false;
  const visit = (n: TSESTree.Node): void => {
    if (found) return;
    if (n.type === AST_NODE_TYPES.Identifier && n.name === 'arguments') {
      found = true;
      return;
    }
    if (isFunction(n)) return;
    for (const [key, value] of Object.entries(n)) {
      if (key === 'parent') continue;
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === 'string') visit(child);
        }
      } else if (value && typeof (value as TSESTree.Node).type === 'string') {
        visit(value as TSESTree.Node);
      }
    }
  };
  visit(node);
  return found;
}

/**
 * Is this node inside the test of an `if`, a loop, a `?:`, or the left side
 * of `&&` / `||` / `??`, below the given function?
 */
function inCondition(node: TSESTree.Node, fn: FunctionNode): boolean {
  let child: TSESTree.Node = node;
  let parent = node.parent;
  while (parent && parent !== fn) {
    switch (parent.type) {
      case AST_NODE_TYPES.IfStatement:
      case AST_NODE_TYPES.ConditionalExpression:
      case AST_NODE_TYPES.WhileStatement:
      case AST_NODE_TYPES.DoWhileStatement:
        if (parent.test === child) return true;
        break;
      case AST_NODE_TYPES.LogicalExpression:
        if (parent.left === child) return true;
        break;
      default:
        break;
    }
    child = parent;
    parent = parent.parent;
  }
  return false;
}

function readsProperty(node: TSESTree.Node, name: string): boolean {
  let found = false;
  const stack: TSESTree.Node[] = [node];
  while (stack.length > 0 && !found) {
    const current = stack.pop() as TSESTree.Node;
    if (
      current.type === AST_NODE_TYPES.MemberExpression &&
      propertyName(current) === name
    ) {
      found = true;
      break;
    }
    if (isFunction(current)) continue;
    for (const [key, value] of Object.entries(current)) {
      if (key === 'parent') continue;
      const children = Array.isArray(value) ? value : [value];
      for (const child of children) {
        if (
          child &&
          typeof child === 'object' &&
          typeof (child as TSESTree.Node).type === 'string'
        ) {
          stack.push(child as TSESTree.Node);
        }
      }
    }
  }
  return found;
}

export const noUnboundedCauseRecursion = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-cause-recursion',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-unbounded-cause-recursion.md',
      description:
        'Require a visited set or depth bound in a function that recurses down error.cause',
      cwe: 'CWE-674',
    },
    messages: {
      unboundedCauseRecursion: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unbounded cause recursion',
        cwe: 'CWE-674',
        description:
          '{{name}} calls itself on error.cause with no visited set or depth bound. A cyclic cause (err.cause = err, or two errors citing each other) makes it throw RangeError: Maximum call stack size exceeded, replacing the error being handled.',
        severity: 'MEDIUM',
        fix: 'Track visited errors in a Set or WeakSet (check .has before recursing, .add before descending), or pass and check a depth limit.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/674.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** The variable this identifier resolves to, if any. */
    function resolve(
      node: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | null {
      let scope: TSESLint.Scope.Scope | null =
        context.sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(node.name);
        if (variable) return variable;
        scope = scope.upper;
      }
      return null;
    }

    /** The binding a function can call itself through, and its report node. */
    function selfBinding(
      fn: FunctionNode,
    ): { variable: TSESLint.Scope.Variable; id: TSESTree.Identifier } | null {
      if (fn.type !== AST_NODE_TYPES.ArrowFunctionExpression && fn.id) {
        const variable = context.sourceCode
          .getDeclaredVariables(fn)
          .find((v) => v.name === fn.id!.name);
        return variable ? { variable, id: fn.id } : null;
      }
      const parent = fn.parent;
      if (
        parent?.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.init === fn &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        const variable = context.sourceCode
          .getDeclaredVariables(parent)
          .find((v) => v.name === (parent.id as TSESTree.Identifier).name);
        return variable ? { variable, id: parent.id } : null;
      }
      return null;
    }

    /** Is this identifier a reference to the given variable? */
    function refersTo(
      node: TSESTree.Node,
      variable: TSESLint.Scope.Variable,
    ): boolean {
      return (
        node.type === AST_NODE_TYPES.Identifier && resolve(node) === variable
      );
    }

    /**
     * Does this argument carry an error's cause? `e.cause`, or a variable
     * declared from one (`const { cause } = e`, `let c = e.cause`) or later
     * assigned one.
     */
    function carriesCause(node: TSESTree.Node): boolean {
      if (readsProperty(node, 'cause')) return true;
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = resolve(node);
      if (!variable) return false;
      for (const def of variable.defs) {
        if (def.type !== 'Variable') continue;
        const declarator = def.node as TSESTree.VariableDeclarator;
        if (declarator.init && readsProperty(declarator.init, 'cause')) {
          return true;
        }
        // `const { cause } = e`
        if (
          declarator.id.type === AST_NODE_TYPES.ObjectPattern &&
          declarator.id.properties.some(
            (p) =>
              p.type === AST_NODE_TYPES.Property &&
              p.value === def.name &&
              ((p.key.type === AST_NODE_TYPES.Identifier &&
                p.key.name === 'cause') ||
                (p.key.type === AST_NODE_TYPES.Literal &&
                  p.key.value === 'cause')),
          )
        ) {
          return true;
        }
      }
      return variable.references.some((ref) => {
        const parent = ref.identifier.parent;
        return (
          ref.isWrite() &&
          parent?.type === AST_NODE_TYPES.AssignmentExpression &&
          parent.left === ref.identifier &&
          readsProperty(parent.right, 'cause')
        );
      });
    }

    /** The calls through which this function recurses down a cause chain. */
    function causeRecursions(
      fn: FunctionNode,
      variable: TSESLint.Scope.Variable,
    ): TSESTree.CallExpression[] {
      const calls: TSESTree.CallExpression[] = [];
      walkOwnBody(fn, (node) => {
        if (node.type !== AST_NODE_TYPES.CallExpression) return;
        // walk(e.cause)
        if (refersTo(node.callee, variable)) {
          if (node.arguments.some((a) => carriesCause(a))) calls.push(node);
          return;
        }
        // e.errors.map(walk)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          ITERATING_METHODS.has(propertyName(node.callee) ?? '') &&
          readsProperty(node.callee.object, 'errors') &&
          node.arguments.some((a) => refersTo(a, variable))
        ) {
          calls.push(node);
        }
      });
      return calls;
    }

    /**
     * The bindings that hold the error being walked: every parameter in the
     * position a recursive call fills with a cause (the first one for
     * `errors.map(walk)`), and every binding whose `.cause` the body reads.
     */
    function walkedValues(
      fn: FunctionNode,
      recursions: readonly TSESTree.CallExpression[],
    ): Set<TSESLint.Scope.Variable> {
      const walked = new Set<TSESLint.Scope.Variable>();
      const params = context.sourceCode.getDeclaredVariables(fn);
      const paramAt = (index: number): void => {
        const param = fn.params[index];
        const id =
          param?.type === AST_NODE_TYPES.AssignmentPattern ? param.left : param;
        if (id?.type !== AST_NODE_TYPES.Identifier) return;
        const variable = params.find((v) => v.name === id.name);
        if (variable) walked.add(variable);
      };
      for (const call of recursions) {
        if (call.arguments.some((a) => carriesCause(a))) {
          call.arguments.forEach((a, i) => {
            if (carriesCause(a)) paramAt(i);
          });
        } else {
          paramAt(0);
        }
      }
      walkOwnBody(fn, (node) => {
        if (
          node.type === AST_NODE_TYPES.MemberExpression &&
          node.object.type === AST_NODE_TYPES.Identifier &&
          propertyName(node) === 'cause'
        ) {
          const target = resolve(node.object);
          if (target) walked.add(target);
        }
      });
      return walked;
    }

    /** A collection looked up and written in the body, or a checked depth. */
    function hasGuard(
      fn: FunctionNode,
      recursions: readonly TSESTree.CallExpression[],
    ): boolean {
      const looked = new Set<TSESLint.Scope.Variable>();
      const recorded = new Set<TSESLint.Scope.Variable>();
      const compared = new Set<TSESLint.Scope.Variable>();
      const recursive = new Set<TSESTree.Node>(recursions);
      // The walked error itself is tested and passed around in any walk
      // (`if (isError(e)) format(e)`): only another binding can be a guard.
      const walked = walkedValues(fn, recursions);
      const isWalked = (node: TSESTree.Node): boolean => {
        const base =
          node.type === AST_NODE_TYPES.MemberExpression ? node.object : node;
        if (base.type !== AST_NODE_TYPES.Identifier) return false;
        const target = resolve(base);
        return target !== null && walked.has(target);
      };
      walkOwnBody(fn, (node) => {
        if (
          node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier
        ) {
          const method = propertyName(node.callee) ?? '';
          const target = resolve(node.callee.object);
          if (target && LOOKUP_METHODS.has(method)) looked.add(target);
          if (target && RECORD_METHODS.has(method)) recorded.add(target);
        }
        // A binding handed to a helper together with the walked error:
        // tested inside a condition, recorded outside one
        // (`if (mapHas(map, v)) …; mapSet(map, v, copy)`).
        if (
          node.type === AST_NODE_TYPES.CallExpression &&
          !recursive.has(node) &&
          node.arguments.some(isWalked)
        ) {
          const into = inCondition(node, fn) ? looked : recorded;
          for (const arg of node.arguments) {
            if (arg.type !== AST_NODE_TYPES.Identifier) continue;
            const target = resolve(arg);
            if (target) into.add(target);
          }
        }
        // A marker key written on the walked error: `err[seen] = true`
        // records, `seen in x` tests.
        if (
          node.type === AST_NODE_TYPES.AssignmentExpression &&
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.computed &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          isWalked(node.left.object)
        ) {
          const target = resolve(node.left.property);
          if (target) recorded.add(target);
        }
        if (
          node.type === AST_NODE_TYPES.BinaryExpression &&
          node.operator === 'in' &&
          node.left.type === AST_NODE_TYPES.Identifier
        ) {
          const target = resolve(node.left);
          if (target) looked.add(target);
        }
        if (
          node.type === AST_NODE_TYPES.BinaryExpression &&
          BOUND_OPERATORS.has(node.operator)
        ) {
          for (const side of [node.left, node.right]) {
            if (side.type === AST_NODE_TYPES.Identifier) {
              const target = resolve(side);
              if (target) compared.add(target);
            }
          }
        }
      });
      for (const target of looked) {
        if (recorded.has(target) && !walked.has(target)) return true;
      }
      // A compared parameter (or a local read from `arguments`, a transpiled
      // default parameter) passed on changed in a recursive call.
      const params = context.sourceCode
        .getScope(fn)
        .variables.filter(
          (v) =>
            compared.has(v) &&
            v.defs.some(
              (def) =>
                def.type === 'Parameter' ||
                (def.type === 'Variable' &&
                  (def.node as TSESTree.VariableDeclarator).init != null &&
                  readsArguments(
                    (def.node as TSESTree.VariableDeclarator).init!,
                  )),
            ),
        );
      return recursions.some((call) =>
        call.arguments.some(
          (arg) =>
            (arg.type === AST_NODE_TYPES.BinaryExpression &&
              (arg.operator === '+' || arg.operator === '-') &&
              [arg.left, arg.right].some((side) =>
                params.some((v) => refersTo(side, v)),
              )) ||
            (arg.type === AST_NODE_TYPES.UpdateExpression &&
              params.some((v) => refersTo(arg.argument, v))),
        ),
      );
    }

    function check(fn: FunctionNode): void {
      const self = selfBinding(fn);
      if (!self) return;
      const recursions = causeRecursions(fn, self.variable);
      if (recursions.length === 0 || hasGuard(fn, recursions)) return;
      context.report({
        node: self.id,
        messageId: 'unboundedCauseRecursion',
        data: { name: self.id.name },
      });
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});
