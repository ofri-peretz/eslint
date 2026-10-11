/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Does this expression carry a tool argument? — bounded,
 * intra-file value following.
 *
 * The question a sink asks is not "is this expression literally `cmd`" but
 * "does its value come from what the model sent". That value travels:
 *
 *     const parts = command.trim().split(' ');   // derived string
 *     const bin = parts[0];                      // member read
 *     let c = 'ls'; if (x) c = args.custom;      // reassignment
 *     ({ d } = args);                            // destructuring assignment
 *     execSync(buildCommand(ref));               // a same-file helper's return
 *
 * Every hop is resolved through the ESLint scope manager — a reference is
 * followed to the variable it binds, never matched by name — so a callback
 * parameter that shadows a tool argument is a different variable and does not
 * carry it. Following is bounded ({@link MAX_FLOW_DEPTH}) and cycle-guarded.
 *
 * Deliberately NOT followed: an arbitrary call (`lookup(cmd)` may map it to a
 * fixed value), a computed lookup into another object (`ALLOWED[cmd]` is the
 * allowlist), arithmetic/comparison, and anything in another file.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { propertyName } from '@interlace/eslint-devkit';
import {
  isFunctionNode,
  lookupVariable,
  propertyKey,
  resolveFunction,
  type FunctionNode,
} from './tool-registration';

/** How many hops a single question may take before it gives up. */
export const MAX_FLOW_DEPTH = 16;

/**
 * Methods whose result is derived from the receiver's text — the
 * normalisation a handler applies before using an argument.
 */
export const STRING_DERIVING: ReadonlySet<string> = new Set([
  'trim',
  'trimStart',
  'trimEnd',
  'split',
  'slice',
  'substring',
  'substr',
  'toLowerCase',
  'toUpperCase',
  'toLocaleLowerCase',
  'toLocaleUpperCase',
  'replace',
  'replaceAll',
  'padStart',
  'padEnd',
  'normalize',
  'at',
  'toString',
  'valueOf',
  'concat',
  'join',
  'repeat',
]);

/**
 * What an expression holds, relative to the tool's arguments.
 *
 *   - `value`: a value taken from the arguments (or derived from one). `text`
 *     names where it came from, `key` is the top-level argument key.
 *   - `object`: the arguments object itself (`toArgs` = `[]`) or an ancestor
 *     of it (`request` with `toArgs` = `['params', 'arguments']`). Passing the
 *     object whole to a sink is not a command; reading a member of it is.
 */
export type Taint =
  | { kind: 'value'; text: string; key: string | undefined }
  | {
      kind: 'object';
      text: string;
      toArgs: readonly string[];
      /** Argument keys the schema restricts to a closed set of values. */
      closed?: ReadonlySet<string>;
    };

/** The argument object a tool handler's first parameter receives. */
export interface HandlerRoot {
  toArgs: readonly string[];
  closed: ReadonlySet<string>;
}

/** Read `key` off a tainted value. `null` key = a computed/element read. */
export function memberStep(t: Taint, key: string | null): Taint | null {
  if (t.kind === 'value')
    return key === null ? t : { ...t, text: `${t.text}.${key}` };
  if (key === null) return null;
  const text = t.text === '' ? key : `${t.text}.${key}`;
  if (t.toArgs.length === 0) {
    if (t.closed?.has(key)) return null;
    return { kind: 'value', text, key };
  }
  return t.toArgs[0] === key
    ? { kind: 'object', text, toArgs: t.toArgs.slice(1), closed: t.closed }
    : null;
}

/**
 * The taint `target` receives when `source` is destructured through
 * `pattern`, or `undefined` when `target` is not bound by `pattern`.
 */
export function throughPattern(
  pattern: TSESTree.Node,
  target: TSESTree.Node,
  source: Taint | null,
): Taint | null | undefined {
  if (pattern === target) return source;
  if (pattern.type === 'AssignmentPattern')
    return throughPattern(pattern.left, target, source);
  if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      let found: Taint | null | undefined;
      if (prop.type === 'RestElement') {
        // The rest of the arguments is still arguments; the rest of a request
        // is not.
        const rest =
          source?.kind === 'object' && source.toArgs.length > 0 ? null : source;
        found = throughPattern(prop.argument, target, rest);
      } else {
        const key = propertyKey(prop) ?? null;
        found = throughPattern(
          prop.value,
          target,
          source && memberStep(source, key),
        );
      }
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (pattern.type === 'ArrayPattern') {
    for (const element of pattern.elements) {
      if (element === null) continue;
      const inner = element.type === 'RestElement' ? element.argument : element;
      const found = throughPattern(
        inner,
        target,
        source && memberStep(source, null),
      );
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** Every value a function can return, not looking inside nested functions. */
function returnedExpressions(fn: FunctionNode): TSESTree.Node[] {
  if (fn.body.type !== 'BlockStatement') return [fn.body];
  const found: TSESTree.Node[] = [];
  const visit = (node: TSESTree.Node): void => {
    if (node.type === 'ReturnStatement') {
      if (node.argument) found.push(node.argument);
      return;
    }
    if (isFunctionNode(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        if (
          child !== null &&
          typeof child === 'object' &&
          typeof (child as TSESTree.Node).type === 'string'
        )
          visit(child as TSESTree.Node);
      }
    }
  };
  for (const statement of fn.body.body) visit(statement);
  return found;
}

type Env = ReadonlyMap<TSESLint.Scope.Variable, Taint | null>;

/** Nodes between a destructured identifier and its assignment. */
const PATTERN_PARTS: ReadonlySet<string> = new Set([
  'Property',
  'ObjectPattern',
  'ArrayPattern',
  'RestElement',
  'AssignmentPattern',
]);

/**
 * Build the question "what does this expression carry?" for one file.
 *
 * @param handlerRoot - the argument object a function's first parameter
 *   receives, when that function is a tool handler; `undefined` otherwise.
 */
export function createFlow(
  sourceCode: Readonly<TSESLint.SourceCode>,
  handlerRoot: (fn: TSESTree.Node) => HandlerRoot | undefined,
): (node: TSESTree.Node) => Taint | null {
  const active = new Set<TSESTree.Node>();

  function ofIdentifier(
    node: TSESTree.Identifier,
    depth: number,
    env: Env,
  ): Taint | null {
    const variable = lookupVariable(node.name, sourceCode.getScope(node));
    if (variable === undefined) return null;
    if (env.has(variable)) return env.get(variable)!;
    const def = variable.defs[0];

    if (def?.type === 'Parameter') {
      const fn = def.node as FunctionNode;
      const root = handlerRoot(fn);
      const first = fn.params[0];
      if (root === undefined || first === undefined) return null;
      const t = throughPattern(first, def.name, {
        kind: 'object',
        text: '',
        toArgs: root.toArgs,
        closed: root.closed,
      });
      // A parameter-bound name is cited by its own name.
      return t ? { ...t, text: node.name } : null;
    }

    if (def?.type !== 'Variable') return null;
    const sources: Array<Taint | null | undefined> = [];
    const declarator = def.node;
    if (declarator.init) {
      sources.push(
        throughPattern(
          declarator.id,
          def.name,
          taint(declarator.init, depth + 1, env),
        ),
      );
    }
    for (const ref of variable.references) {
      if (!ref.isWrite() || ref.identifier === def.name) continue;
      // `x = expr`, or `({ x } = expr)` / `[x] = expr` — climb only through
      // the pattern itself, never past it into an unrelated assignment.
      let assignment: TSESTree.Node | undefined = ref.identifier.parent;
      while (assignment && PATTERN_PARTS.has(assignment.type))
        assignment = assignment.parent;
      // `n++` and `for (x of …)` are writes too, but not assignments.
      if (assignment?.type !== 'AssignmentExpression') continue;
      sources.push(
        throughPattern(
          assignment.left,
          ref.identifier,
          taint(assignment.right, depth + 1, env),
        ),
      );
    }
    const found = sources.find((t) => t) ?? null;
    // The arguments object re-bound to a local is cited by the local.
    return found?.kind === 'object' ? { ...found, text: node.name } : found;
  }

  function ofCall(
    node: TSESTree.CallExpression,
    depth: number,
    env: Env,
  ): Taint | null {
    const { callee } = node;
    // `String(x)` — the builtin, not a local of that name.
    if (
      callee.type === 'Identifier' &&
      callee.name === 'String' &&
      !lookupVariable('String', sourceCode.getScope(node))?.defs.length
    ) {
      const arg = node.arguments[0];
      return arg ? asValue(taint(arg, depth + 1, env)) : null;
    }
    if (callee.type === 'MemberExpression') {
      const method = propertyName(callee);
      if (method === null || !STRING_DERIVING.has(method)) return null;
      const receiver = asValue(taint(callee.object, depth + 1, env));
      if (receiver || method !== 'concat') return receiver;
      for (const arg of node.arguments) {
        const t = asValue(taint(arg, depth + 1, env));
        if (t) return t;
      }
      return null;
    }
    // A same-file helper: bind its parameters to the call's arguments and
    // ask what it returns.
    const fn = resolveFunction(callee, sourceCode.getScope(node));
    if (fn === undefined) return null;
    const bound = new Map(env);
    const params = sourceCode.getDeclaredVariables(fn);
    fn.params.forEach((param, i) => {
      const variable = params.find((v) => v.defs[0]?.name === param);
      const arg = node.arguments[i];
      if (variable && arg) bound.set(variable, taint(arg, depth + 1, env));
    });
    for (const expression of returnedExpressions(fn)) {
      const t = asValue(taint(expression, depth + 1, bound));
      if (t) return t;
    }
    return null;
  }

  function taint(node: TSESTree.Node, depth: number, env: Env): Taint | null {
    if (depth > MAX_FLOW_DEPTH || active.has(node)) return null;
    active.add(node);
    try {
      return compute(node, depth, env);
    } finally {
      active.delete(node);
    }
  }

  function firstOf(
    nodes: ReadonlyArray<TSESTree.Node | null>,
    depth: number,
    env: Env,
    valuesOnly: boolean,
  ): Taint | null {
    for (const node of nodes) {
      if (node === null) continue;
      const inner = node.type === 'SpreadElement' ? node.argument : node;
      const t = taint(inner, depth + 1, env);
      const kept = valuesOnly ? asValue(t) : t;
      if (kept) return kept;
    }
    return null;
  }

  function compute(node: TSESTree.Node, depth: number, env: Env): Taint | null {
    switch (node.type) {
      case 'Identifier':
        return ofIdentifier(node, depth, env);
      case 'MemberExpression': {
        const object = taint(node.object, depth + 1, env);
        return object && memberStep(object, propertyName(node));
      }
      case 'CallExpression':
        return ofCall(node, depth, env);
      case 'TemplateLiteral':
        return firstOf(node.expressions, depth, env, true);
      case 'ArrayExpression':
        return firstOf(node.elements, depth, env, true);
      case 'BinaryExpression':
        return node.operator === '+'
          ? firstOf([node.left, node.right], depth, env, true)
          : null;
      case 'LogicalExpression':
        return firstOf([node.left, node.right], depth, env, false);
      case 'ConditionalExpression':
        return firstOf([node.consequent, node.alternate], depth, env, false);
      case 'SequenceExpression':
        return taint(
          node.expressions[node.expressions.length - 1]!,
          depth + 1,
          env,
        );
      case 'AwaitExpression':
      case 'ChainExpression':
      case 'TSAsExpression':
      case 'TSNonNullExpression':
      case 'TSTypeAssertion':
      case 'TSSatisfiesExpression': {
        const inner =
          node.type === 'AwaitExpression' ? node.argument : node.expression;
        return taint(inner, depth + 1, env);
      }
      default:
        return null;
    }
  }

  return (node) => taint(node, 0, new Map());
}

function asValue(t: Taint | null): Taint | null {
  return t?.kind === 'value' ? t : null;
}
