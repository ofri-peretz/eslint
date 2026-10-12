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
 *     runGit(ref);  function runGit(r) { execSync(r) }  // a helper's parameter
 *     this.run(ref);                             // a method of this class
 *     for (const p of paths) readFile(p);        // an element of an argument
 *     const { path } = Schema.parse(args);       // a Zod parse of the arguments
 *
 * Every hop is resolved through the ESLint scope manager — a reference is
 * followed to the variable it binds, never matched by name — so a callback
 * parameter that shadows a tool argument is a different variable and does not
 * carry it. Following is bounded ({@link MAX_FLOW_DEPTH}) and cycle-guarded.
 *
 * A helper's parameter carries whatever its callers in this file pass it — a
 * call site is found by resolving its callee to the helper (a function
 * declaration, a `const` function, or `this.method` inside the same class),
 * never by matching a name. An object literal passed to a helper, or held in
 * a `const`, is read field by field.
 *
 * Deliberately NOT followed: an arbitrary call (`lookup(cmd)` may map it to a
 * fixed value), a computed lookup into another object (`ALLOWED[cmd]` is the
 * allowlist), arithmetic/comparison, and anything in another file — except a
 * Zod schema imported from a relative module, read to decide that `.parse`
 * hands the arguments back.
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
import { ZOD_PARSERS, ZOD_SAFE_PARSERS, zodSchemaOf } from './zod';

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

/** Array methods whose callback's first parameter is an element of the receiver. */
const ELEMENT_CALLBACKS: ReadonlySet<string> = new Set([
  'map',
  'flatMap',
  'forEach',
  'filter',
  'find',
  'findLast',
  'findIndex',
  'some',
  'every',
]);

/** Array methods whose result is drawn from the receiver's own elements. */
const ARRAY_SELECTORS: ReadonlySet<string> = new Set([
  'filter',
  'find',
  'findLast',
  'sort',
  'reverse',
  'flat',
  'toSorted',
  'toReversed',
]);

/** Array methods whose result is what their callback returns. */
const ARRAY_MAPPERS: ReadonlySet<string> = new Set(['map', 'flatMap']);

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

/** The argument object one of a handler's parameters receives. */
export interface HandlerRoot {
  toArgs: readonly string[];
  closed: ReadonlySet<string>;
  /**
   * Which parameter receives it — the first by default. A `ResourceTemplate`
   * callback is `(uri, variables, extra)`, and the request context a tool
   * handler gets (`extra`) sits after its arguments.
   */
  param?: number;
}

/**
 * A rule's own say over one expression, asked before the built-in following.
 *
 * Returns the taint the expression carries, `null` for "carries nothing", or
 * `undefined` to let the flow decide. `follow` continues the same bounded,
 * cycle-guarded question one hop further, so a hook can say "`path.join(a, b)`
 * carries whatever `a` or `b` carries" without re-implementing the walk.
 */
export type FlowIntercept = (
  node: TSESTree.Node,
  follow: (next: TSESTree.Node) => Taint | null,
) => Taint | null | undefined;

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
export function returnedExpressions(fn: FunctionNode): TSESTree.Node[] {
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

/** Where the linted file lives, and how a call site may stop a value. */
export interface FlowOptions {
  /** The active parser, for reading Zod schemas out of relative modules. */
  parser?: unknown;
  /** The linted file's path, for resolving relative imports. */
  file: string;
  /**
   * Follow a helper's parameter back to what its callers pass (default
   * `true`). A rule that judges each call site itself turns this off, so one
   * flow is not reported twice.
   */
  followCallers?: boolean;
  /**
   * A call site that does not pass `arg` on into the callee — because the
   * caller checked it before the call (a containment or host check).
   */
  blocksCallSite?: (
    call: TSESTree.CallExpression,
    arg: TSESTree.Node,
  ) => boolean;
}

/** The {@link FlowOptions} of the file a rule is linting. */
export function flowOptionsFor(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  blocksCallSite?: FlowOptions['blocksCallSite'],
): FlowOptions {
  return {
    parser: (context.languageOptions as { parser?: unknown } | undefined)
      ?.parser,
    file: context.filename,
    blocksCallSite,
  };
}

/** Child nodes, skipping `parent` back-links. */
function childNodes(node: TSESTree.Node): TSESTree.Node[] {
  const out: TSESTree.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (
        child !== null &&
        typeof child === 'object' &&
        typeof (child as TSESTree.Node).type === 'string'
      )
        out.push(child as TSESTree.Node);
    }
  }
  return out;
}

/** Per file: same-file function → the calls in that file that invoke it. */
const callIndexes = new WeakMap<
  object,
  Map<TSESTree.Node, TSESTree.CallExpression[]>
>();

/**
 * The calls in this file whose callee resolves to a given function — a
 * function declaration, a `const` function, or `this.method` in the same class
 * (see `resolveFunction`). Built once per file, on first use.
 */
export function callSitesIn(
  sourceCode: Readonly<TSESLint.SourceCode>,
): (fn: TSESTree.Node) => readonly TSESTree.CallExpression[] {
  return (fn) => {
    let index = callIndexes.get(sourceCode.ast);
    if (index === undefined) {
      const built = new Map<TSESTree.Node, TSESTree.CallExpression[]>();
      const visit = (node: TSESTree.Node): void => {
        if (node.type === 'CallExpression') {
          const target = resolveFunction(
            node.callee,
            sourceCode.getScope(node),
          );
          if (target !== undefined) {
            const calls = built.get(target) ?? [];
            calls.push(node);
            built.set(target, calls);
          }
        }
        for (const child of childNodes(node)) visit(child);
      };
      visit(sourceCode.ast);
      callIndexes.set(sourceCode.ast, built);
      index = built;
    }
    return index.get(fn) ?? [];
  };
}

/** The key path from a parameter pattern to `target`, or `undefined`. */
function keyPath(
  pattern: TSESTree.Node,
  target: TSESTree.Node,
): string[] | undefined {
  if (pattern === target) return [];
  if (pattern.type === 'AssignmentPattern')
    return keyPath(pattern.left, target);
  if (pattern.type !== 'ObjectPattern') return undefined;
  for (const prop of pattern.properties) {
    if (prop.type === 'RestElement') continue;
    const key = propertyKey(prop);
    const rest = key === undefined ? undefined : keyPath(prop.value, target);
    if (rest) return [key!, ...rest];
  }
  return undefined;
}

/** Does `pattern` bind `target` anywhere inside it? */
function binds(pattern: TSESTree.Node, target: TSESTree.Node): boolean {
  if (pattern === target) return true;
  return childNodes(pattern).some((child) => binds(child, target));
}

/**
 * Build the question "what does this expression carry?" for one file.
 *
 * @param handlerRoot - the argument object a function's first parameter
 *   receives, when that function is a tool handler; `undefined` otherwise.
 */
export function createFlow(
  sourceCode: Readonly<TSESLint.SourceCode>,
  handlerRoot: (fn: TSESTree.Node) => HandlerRoot | undefined,
  intercept: FlowIntercept | undefined,
  options: FlowOptions,
): (node: TSESTree.Node) => Taint | null {
  const active = new Set<TSESTree.Node>();
  const callsOf = callSitesIn(sourceCode);

  /** The taint a `const` object literal or a caller's literal gives `key`. */
  function fieldOf(
    node: TSESTree.Node,
    path: readonly string[],
    depth: number,
    env: Env,
  ): Taint | null {
    if (path.length === 0) return taint(node, depth + 1, env);
    let literal: TSESTree.Node = node;
    if (literal.type === 'Identifier') {
      const def = lookupVariable(literal.name, sourceCode.getScope(literal))
        ?.defs[0];
      if (
        def?.type === 'Variable' &&
        def.node.id === def.name &&
        def.node.init?.type === 'ObjectExpression'
      )
        literal = def.node.init;
    }
    if (literal.type === 'ObjectExpression') {
      // The last writer wins; a spread after the key may replace it.
      let found: Taint | null = null;
      for (const prop of literal.properties) {
        if (prop.type === 'SpreadElement')
          found = fieldOf(prop.argument, path, depth + 1, env);
        else if (propertyKey(prop) === path[0])
          found = fieldOf(prop.value, path.slice(1), depth + 1, env);
      }
      return found;
    }
    let t = taint(node, depth + 1, env);
    for (const key of path) t = t && memberStep(t, key);
    return t;
  }

  /**
   * What a non-handler function's parameter receives: an element of the
   * array a callback iterates, or what its callers in this file pass it.
   */
  function ofCallers(
    fn: FunctionNode,
    name: TSESTree.Node,
    depth: number,
    env: Env,
  ): Taint | null {
    const index = fn.params.findIndex((param) => binds(param, name));
    const param = fn.params[index];
    if (param === undefined || param.type === 'RestElement') return null;
    // `paths.map((p) => …)`, `paths.forEach((p) => …)`.
    const call = fn.parent;
    if (
      call?.type === 'CallExpression' &&
      call.arguments[0] === fn &&
      call.callee.type === 'MemberExpression' &&
      ELEMENT_CALLBACKS.has(propertyName(call.callee) ?? '')
    ) {
      const iterated = taint(call.callee.object, depth + 1, env);
      const element = iterated && memberStep(iterated, null);
      // `binds` found `name` in `param`, so the pattern always binds it.
      return index === 0
        ? (throughPattern(param, name, element) as Taint | null)
        : null;
    }
    if (options.followCallers === false) return null;
    const path = keyPath(param, name);
    let object: Taint | null = null;
    for (const site of callsOf(fn)) {
      const arg = site.arguments[index];
      if (arg === undefined || arg.type === 'SpreadElement') continue;
      if (options.blocksCallSite?.(site, arg)) continue;
      const t =
        path !== undefined
          ? fieldOf(arg, path, depth, env)
          : (throughPattern(
              param,
              name,
              taint(arg, depth + 1, env),
            ) as Taint | null);
      if (t?.kind === 'value') return t;
      object ??= t;
    }
    return object;
  }

  /** `o.key` where `o` is an object literal here, or a parameter given one. */
  function literalField(
    node: TSESTree.MemberExpression,
    depth: number,
    env: Env,
  ): Taint | null | undefined {
    const key = propertyName(node);
    if (key === null || node.object.type !== 'Identifier') return undefined;
    const variable = lookupVariable(
      node.object.name,
      sourceCode.getScope(node.object),
    );
    const def = variable?.defs[0];
    if (
      def?.type === 'Variable' &&
      def.parent.kind === 'const' &&
      def.node.id === def.name &&
      def.node.init?.type === 'ObjectExpression'
    )
      return fieldOf(def.node.init, [key], depth, env);
    if (
      def?.type !== 'Parameter' ||
      env.has(variable!) ||
      options.followCallers === false
    )
      return undefined;
    const fn = def.node as FunctionNode;
    if (handlerRoot(fn) !== undefined) return undefined;
    // A parameter's name is always bound by one of the function's params.
    const param = fn.params.find((p) => binds(p, def.name))!;
    const index = fn.params.indexOf(param);
    const path = keyPath(param, def.name);
    if (path === undefined) return undefined;
    let found: Taint | null = null;
    for (const site of callsOf(fn)) {
      const arg = site.arguments[index];
      if (arg === undefined || arg.type === 'SpreadElement') continue;
      if (options.blocksCallSite?.(site, arg)) continue;
      const t = fieldOf(arg, [...path, key], depth, env);
      if (t?.kind === 'value') return t;
      found ??= t;
    }
    return found ?? undefined;
  }

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
      if (root === undefined) {
        const t = ofCallers(fn, def.name, depth, env);
        return t ? { ...t, text: node.name } : null;
      }
      const param = fn.params[root.param ?? 0];
      if (param === undefined) return null;
      const t = throughPattern(param, def.name, {
        kind: 'object',
        text: '',
        toArgs: root!.toArgs,
        closed: root!.closed,
      });
      // A parameter-bound name is cited by its own name.
      return t ? { ...t, text: node.name } : null;
    }

    if (def?.type !== 'Variable') return null;
    const sources: Array<Taint | null | undefined> = [];
    const declarator = def.node;
    const loop = def.parent.parent;
    // `for (const p of paths)` — an element of the iterated value.
    if (loop?.type === 'ForOfStatement' && loop.left === def.parent) {
      const iterated = taint(loop.right, depth + 1, env);
      sources.push(
        throughPattern(
          declarator.id,
          def.name,
          iterated && memberStep(iterated, null),
        ),
      );
    }
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
      if (method === null) return null;
      if (ZOD_PARSERS.has(method) || ZOD_SAFE_PARSERS.has(method))
        return ofParse(node, callee, method, depth, env);
      if (ARRAY_MAPPERS.has(method)) {
        // `paths.map((p) => p.trim())` — what the callback returns.
        const fn = resolveFunction(
          node.arguments[0],
          sourceCode.getScope(node),
        );
        for (const expression of fn ? returnedExpressions(fn) : []) {
          const t = asValue(taint(expression, depth + 1, env));
          if (t) return t;
        }
        return null;
      }
      if (ARRAY_SELECTORS.has(method))
        return asValue(taint(callee.object, depth + 1, env));
      if (!STRING_DERIVING.has(method)) return null;
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
    // A value wins; failing that, a helper that hands back the arguments
    // object (`argsOf(args).cmd`) still carries it to the member read.
    let object: Taint | null = null;
    for (const expression of returnedExpressions(fn)) {
      const t = taint(expression, depth + 1, bound);
      if (t?.kind === 'value') return t;
      object ??= t;
    }
    return object;
  }

  /**
   * `Schema.parse(x)` / `Schema.safeParse(x)` on a Zod schema: the parsed
   * value is `x` — checked for shape, not for content — less the keys the
   * schema restricts to a closed set. Any other `.parse` is not followed.
   */
  function ofParse(
    node: TSESTree.CallExpression,
    callee: TSESTree.MemberExpression,
    method: string,
    depth: number,
    env: Env,
  ): Taint | null {
    const schema = zodSchemaOf(
      callee.object,
      {
        scope: sourceCode.getScope(callee.object),
        file: options.file,
      },
      options.parser,
    );
    const input = node.arguments[0];
    if (schema === undefined || input === undefined) return null;
    const t = taint(input, depth + 1, env);
    if (t === null || (t.kind === 'value' && schema.closedValue)) return null;
    if (t.kind === 'value') return t;
    const closed = new Set(t.closed);
    if (t.toArgs.length === 0) for (const key of schema.closed) closed.add(key);
    return {
      ...t,
      closed,
      toArgs: ZOD_SAFE_PARSERS.has(method) ? ['data', ...t.toArgs] : t.toArgs,
    };
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
    const decided = intercept?.(node, (next) => taint(next, depth + 1, env));
    if (decided !== undefined) return decided;
    switch (node.type) {
      case 'Identifier':
        return ofIdentifier(node, depth, env);
      case 'MemberExpression': {
        const field = literalField(node, depth, env);
        if (field !== undefined) return field;
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
