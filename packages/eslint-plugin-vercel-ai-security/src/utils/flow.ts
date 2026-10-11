/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Bounded, same-file value following.
 *
 * `derivesFrom(node, flow)` asks: is any part of this value made of something
 * `flow.isSource` recognises? It follows the value backwards through:
 *
 *   - declarations, destructures and every later assignment of a binding
 *   - `await`, `as`, `!`, `satisfies`, `?.`, ternaries, `??` / `||`, `+`, templates
 *   - member reads (`body.persona` is made of `body`)
 *   - array / string derivations (`.map`, `.filter`, `.join`, `.slice`, …) and
 *     value wrappers (`JSON.stringify`, `String`, `Number`, …)
 *   - the returns of a same-file function, with its parameters bound to the
 *     call's arguments
 *   - a parameter, back to every same-file caller: direct calls, JSX usages of
 *     a component, and the receiver of an element callback (`xs.map(x => …)`)
 *
 * It never decides from a name. Depth and total work are bounded and a binding
 * already on the current path is not re-entered, so cyclic code terminates.
 * Anything it cannot follow — an import, an unknown call — is "not derived".
 */

import {
  AST_NODE_TYPES,
  memberPath,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type Variable = TSESLint.Scope.Variable;
type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export interface Flow {
  readonly sourceCode: TSESLint.SourceCode;
  /** The origin being traced: a request read, an SDK call, a DB row… */
  isSource(node: TSESTree.Node): boolean;
  /** A parameter the origin arrives through by contract (a tool input, an SDK-typed prop). */
  isSourceParameter?(variable: Variable, fn: FunctionNode): boolean;
  /** A call that cleans the value: following stops there. */
  isBarrier?(node: TSESTree.Node): boolean;
}

/** Longest chain of hops followed from the starting node. */
const MAX_DEPTH = 16;
/** Total nodes visited per question, whatever the shape of the code. */
const MAX_STEPS = 4000;

/** Array / string methods whose result is made of the receiver's content. */
const DERIVATIONS = new Set([
  'map',
  'flatMap',
  'filter',
  'slice',
  'flat',
  'join',
  'concat',
  'reduce',
  'find',
  'findLast',
  'at',
  'sort',
  'toSorted',
  'reverse',
  'toString',
  'trim',
  'trimStart',
  'trimEnd',
  'toLowerCase',
  'toUpperCase',
  'replace',
  'replaceAll',
  'split',
  'substring',
  'padStart',
  'padEnd',
  'match',
  'normalize',
]);

/** Methods that hand each element of the receiver to their callback. */
const ELEMENT_CALLBACKS = new Set([
  'map',
  'flatMap',
  'filter',
  'forEach',
  'find',
  'findLast',
  'some',
  'every',
  'reduce',
]);

/** Global functions whose result is made of their first argument. */
const WRAPPERS = new Set([
  'JSON.stringify',
  'String',
  'Number',
  'parseInt',
  'parseFloat',
  'Array.from',
  'Object.values',
  'Object.entries',
]);

/** Find the variable `name` resolves to from `scope`. */
export function lookupVariable(
  name: string,
  scope: TSESLint.Scope.Scope,
): Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable) return variable;
  }
  return undefined;
}

function isFunction(
  node: TSESTree.Node | null | undefined,
): node is FunctionNode {
  return (
    node?.type === AST_NODE_TYPES.FunctionDeclaration ||
    node?.type === AST_NODE_TYPES.FunctionExpression ||
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** Is this call `xs.map(...)` / `.filter` / `.join` …, deriving from its receiver? */
export function isDerivationCall(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    DERIVATIONS.has(propertyName(node.callee) as string)
  );
}

/** The same-file function a callee names: `f` for `function f` or `const f = () => …`. */
export function sameFileFunction(
  callee: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): FunctionNode | null {
  if (callee.type !== AST_NODE_TYPES.Identifier) return null;
  const def = lookupVariable(callee.name, sourceCode.getScope(callee))?.defs[0];
  if (def?.type === 'FunctionName') return def.node as FunctionNode;
  if (def?.type === 'Variable' && isFunction(def.node.init))
    return def.node.init;
  return null;
}

/** The expressions a function returns, not counting returns of nested functions. */
export function returnsOf(
  fn: FunctionNode,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node[] {
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return [fn.body];
  const found: TSESTree.Node[] = [];
  const visit = (node: TSESTree.Node): void => {
    if (isFunction(node)) return;
    if (node.type === AST_NODE_TYPES.ReturnStatement && node.argument)
      found.push(node.argument);
    for (const key of sourceCode.visitorKeys[node.type] as readonly string[]) {
      const child = (node as unknown as Record<string, unknown>)[key];
      for (const item of Array.isArray(child) ? child : [child]) {
        if (item && typeof (item as TSESTree.Node).type === 'string')
          visit(item as TSESTree.Node);
      }
    }
  };
  for (const statement of fn.body.body) visit(statement);
  return found;
}

function contains(outer: TSESTree.Node, inner: TSESTree.Node): boolean {
  return outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1];
}

/** The binding a function is called by, if it has one. */
function functionVariable(
  fn: FunctionNode,
  sourceCode: TSESLint.SourceCode,
): Variable | undefined {
  const parent = fn.parent;
  const id =
    fn.type === AST_NODE_TYPES.FunctionDeclaration
      ? fn.id
      : parent.type === AST_NODE_TYPES.VariableDeclarator &&
          parent.id.type === AST_NODE_TYPES.Identifier
        ? parent.id
        : null;
  return id ? lookupVariable(id.name, sourceCode.getScope(fn)) : undefined;
}

/** A value bound to a parameter for one call, with the bindings of its own context. */
interface Bound {
  readonly node: TSESTree.Node;
  readonly env: Env;
}
type Env = ReadonlyMap<Variable, Bound>;
const EMPTY_ENV: Env = new Map();

/** Is any part of `node` made of something `flow.isSource` recognises? */
export function derivesFrom(node: TSESTree.Node, flow: Flow): boolean {
  const { sourceCode } = flow;
  let steps = 0;
  const onPath = new Set<Variable>();

  function walk(current: TSESTree.Node, depth: number, env: Env): boolean {
    if (depth > MAX_DEPTH || ++steps > MAX_STEPS) return false;
    if (flow.isSource(current)) return true;
    if (flow.isBarrier?.(current)) return false;
    const next = (child: TSESTree.Node | null): boolean =>
      child !== null && walk(child, depth + 1, env);

    switch (current.type) {
      case AST_NODE_TYPES.AwaitExpression:
      case AST_NODE_TYPES.SpreadElement:
        return next(current.argument);
      case AST_NODE_TYPES.TSAsExpression:
      case AST_NODE_TYPES.TSNonNullExpression:
      case AST_NODE_TYPES.TSSatisfiesExpression:
      case AST_NODE_TYPES.ChainExpression:
        return next(current.expression);
      case AST_NODE_TYPES.TemplateLiteral:
        return current.expressions.some(next);
      case AST_NODE_TYPES.BinaryExpression:
      case AST_NODE_TYPES.LogicalExpression:
        return next(current.left) || next(current.right);
      case AST_NODE_TYPES.ConditionalExpression:
        return next(current.consequent) || next(current.alternate);
      case AST_NODE_TYPES.MemberExpression:
        return next(current.object);
      case AST_NODE_TYPES.ArrayExpression:
        return current.elements.some(next);
      case AST_NODE_TYPES.ObjectExpression:
        return current.properties.some((prop) =>
          next(prop.type === AST_NODE_TYPES.Property ? prop.value : prop),
        );
      case AST_NODE_TYPES.CallExpression:
        return fromCall(current, depth, env);
      case AST_NODE_TYPES.Identifier:
        return fromIdentifier(current, depth, env);
      default:
        return false;
    }
  }

  function fromCall(
    call: TSESTree.CallExpression,
    depth: number,
    env: Env,
  ): boolean {
    const callee = call.callee;
    if (isDerivationCall(call)) {
      return walk((callee as TSESTree.MemberExpression).object, depth + 1, env);
    }
    const path = memberPath(callee);
    if (path !== null && WRAPPERS.has(path.join('.'))) {
      const [first] = call.arguments;
      return first !== undefined && walk(first, depth + 1, env);
    }
    const fn = sameFileFunction(callee, sourceCode);
    if (!fn) return false;
    // Bind each parameter's variables to the argument in its position.
    const inner = new Map<Variable, Bound>();
    for (const variable of sourceCode.getDeclaredVariables(fn)) {
      const index = fn.params.findIndex((param) =>
        contains(param, variable.defs[0].name),
      );
      const arg = call.arguments[index];
      if (arg) inner.set(variable, { node: arg, env });
    }
    return returnsOf(fn, sourceCode).some((expr) =>
      walk(expr, depth + 1, inner),
    );
  }

  function fromIdentifier(
    id: TSESTree.Identifier,
    depth: number,
    env: Env,
  ): boolean {
    const variable = lookupVariable(id.name, sourceCode.getScope(id));
    if (!variable) return false;
    const bound = env.get(variable);
    if (bound) return walk(bound.node, depth + 1, bound.env);
    if (onPath.has(variable)) return false;
    onPath.add(variable);
    let found = variable.references.some(
      (ref) =>
        ref.writeExpr != null && walk(ref.writeExpr, depth + 1, EMPTY_ENV),
    );
    const def = variable.defs[0];
    if (!found && def?.type === 'Parameter') {
      found = fromParameter(variable, def.node as FunctionNode, depth);
    }
    onPath.delete(variable);
    return found;
  }

  /** A parameter is made of what its callers pass in. */
  function fromParameter(
    variable: Variable,
    fn: FunctionNode,
    depth: number,
  ): boolean {
    if (flow.isSourceParameter?.(variable, fn)) return true;
    const name = variable.defs[0].name;
    const index = fn.params.findIndex((param) => contains(param, name));
    const param = fn.params[index];
    // `{ m }` reads the attribute / property `m`; a whole `props` reads them all.
    const key =
      param.type === AST_NODE_TYPES.ObjectPattern &&
      name.parent.type === AST_NODE_TYPES.Property
        ? objectKeyName(name.parent)
        : null;

    // xs.map((x) => …): x is an element of xs.
    const owner = fn.parent;
    if (
      owner.type === AST_NODE_TYPES.CallExpression &&
      owner.callee.type === AST_NODE_TYPES.MemberExpression &&
      ELEMENT_CALLBACKS.has(propertyName(owner.callee) as string)
    ) {
      return walk(owner.callee.object, depth + 1, EMPTY_ENV);
    }

    const fnVariable = functionVariable(fn, sourceCode);
    return (fnVariable?.references ?? []).some((ref) => {
      const site = ref.identifier.parent;
      if (
        site.type === AST_NODE_TYPES.CallExpression &&
        site.callee === ref.identifier
      ) {
        const arg = site.arguments[index];
        return arg !== undefined && walk(arg, depth + 1, EMPTY_ENV);
      }
      if (site.type === AST_NODE_TYPES.JSXOpeningElement && index === 0) {
        return site.attributes.some((attr) => {
          if (attr.type === AST_NODE_TYPES.JSXSpreadAttribute) {
            return walk(attr.argument, depth + 1, EMPTY_ENV);
          }
          return (
            (key === null || attr.name.name === key) &&
            attr.value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
            attr.value.expression.type !== AST_NODE_TYPES.JSXEmptyExpression &&
            walk(attr.value.expression, depth + 1, EMPTY_ENV)
          );
        });
      }
      return false;
    });
  }

  return walk(node, 0, EMPTY_ENV);
}
