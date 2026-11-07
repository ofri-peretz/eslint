/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The code a RuleTester case actually runs, recovered from the test file.
 *
 * A case's `code` is often a fragment that the test file wraps before the
 * RuleTester sees it, and the wrapper is what carries the evidence an
 * evidence-gated rule needs:
 *
 *   code: SDK + `app.use(cors({ origin: '*' }))`    // a local const prefix
 *   code: asExpress(`app.use(cors(...))`)          // a local wrapper function
 *   invalid: xp([{ code: `app.use(...)` }])         // a mapper over the array
 *
 * A reader that takes only the fragment sees no Express and no SDK, so the
 * rule correctly stays silent and the reader wrongly concludes the case does
 * not fire. This module resolves those shapes statically, from the same
 * TypeScript AST the ledger already parses, and returns the fragment and the
 * harness around it separately, so the ledger can store each harness ONCE.
 *
 * A case built by a local generator with several arguments
 * (`ctl(members, controller)`) has no fragment/harness split; when every
 * argument is static it is evaluated whole and stored as its body.
 *
 * A shape it cannot resolve (an imported helper, a harness assembled by
 * runtime logic) is returned as `unresolved` with its source text. It is
 * never guessed, and never dropped.
 *
 * docs/intents/the-ledger-records-fragments-not-files
 */

import ts from 'typescript';

export type Harness =
  { before: string; after: string } | { unresolved: string };

export interface ResolvedCase {
  /** The code as written (or fully evaluated), or null when it cannot be evaluated. */
  body: string | null;
  /** The harness around `body`, when there is one. */
  harness?: { key: string; value: Harness };
}

interface Wrapper {
  params: { name: string; init?: ts.Expression }[];
  body: ts.Expression;
}

interface Context {
  consts: Map<string, ts.Expression>;
  wrappers: Map<string, Wrapper | null>;
}

export type HarnessCache = { context?: Context };

/** Stands in for a wrapper's fragment parameter while its body is evaluated. */
const HOLE = '\u0000HOLE\u0000';

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * Every `const NAME = …` and every local function in the file, by name. The
 * first declaration wins: a test file that declares the same name twice in
 * two scopes is rare, and resolving to the first is no worse than the
 * fragment it replaces.
 */
function contextOf(source: ts.SourceFile): Context {
  const consts = new Map<string, ts.Expression>();
  const wrappers = new Map<string, Wrapper | null>();
  const shape = (
    params: ts.NodeArray<ts.ParameterDeclaration>,
    body: ts.ConciseBody | undefined,
  ): Wrapper | null => {
    if (!body || params.some((p) => !ts.isIdentifier(p.name))) return null;
    const list = params.map((p) => ({
      name: (p.name as ts.Identifier).text,
      init: p.initializer,
    }));
    if (!ts.isBlock(body)) return { params: list, body };
    const [only] = body.statements;
    if (
      body.statements.length !== 1 ||
      !ts.isReturnStatement(only) ||
      !only.expression
    )
      return null;
    return { params: list, body: only.expression };
  };
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0 &&
      !consts.has(node.name.text)
    ) {
      consts.set(node.name.text, node.initializer);
      const fn = unwrap(node.initializer);
      if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))
        wrappers.set(node.name.text, shape(fn.parameters, fn.body));
    }
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      !wrappers.has(node.name.text)
    )
      wrappers.set(node.name.text, shape(node.parameters, node.body));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { consts, wrappers };
}

const MAX_DEPTH = 16;

/**
 * The string an expression evaluates to, from literals, local consts, local
 * wrapper calls and the bound parameters alone; `null` the moment anything
 * else is involved.
 */
function evaluate(
  node: ts.Expression,
  ctx: Context,
  env: ReadonlyMap<string, string>,
  depth = 0,
): string | null {
  if (depth > MAX_DEPTH) return null;
  const expr = unwrap(node);
  const next = (n: ts.Expression, e: ReadonlyMap<string, string> = env) =>
    evaluate(n, ctx, e, depth + 1);
  if (ts.isStringLiteralLike(expr)) return expr.text;
  if (ts.isTemplateExpression(expr)) {
    let out = expr.head.text;
    for (const span of expr.templateSpans) {
      const value = next(span.expression);
      if (value === null) return null;
      out += value + span.literal.text;
    }
    return out;
  }
  if (
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = next(expr.left);
    const right = left === null ? null : next(expr.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isIdentifier(expr)) {
    const bound = env.get(expr.text);
    if (bound !== undefined) return bound;
    const init = ctx.consts.get(expr.text);
    return init === undefined ? null : next(init, new Map());
  }
  if (ts.isCallExpression(expr)) {
    // `[...].join('\n')` — the multi-line harness spelling.
    if (
      ts.isPropertyAccessExpression(expr.expression) &&
      expr.expression.name.text === 'join' &&
      ts.isArrayLiteralExpression(unwrap(expr.expression.expression)) &&
      expr.arguments.length <= 1
    ) {
      const separator =
        expr.arguments.length === 0 ? ',' : next(expr.arguments[0]);
      if (separator === null) return null;
      const parts: string[] = [];
      for (const element of (
        unwrap(expr.expression.expression) as ts.ArrayLiteralExpression
      ).elements) {
        if (ts.isSpreadElement(element)) return null;
        const value = next(element);
        if (value === null) return null;
        parts.push(value);
      }
      return parts.join(separator);
    }
    // A local generator called with static arguments.
    if (ts.isIdentifier(expr.expression)) {
      const wrapper = ctx.wrappers.get(expr.expression.text);
      if (!wrapper || expr.arguments.length > wrapper.params.length)
        return null;
      const bound = new Map<string, string>();
      for (const [i, param] of wrapper.params.entries()) {
        const arg = expr.arguments[i];
        const value =
          arg !== undefined
            ? next(arg)
            : param.init !== undefined
              ? next(param.init, bound)
              : null;
        if (value === null) return null;
        bound.set(param.name, value);
      }
      return next(wrapper.body, bound);
    }
  }
  return null;
}

/** The shell a single-fragment wrapper puts around its first parameter. */
function shellOf(
  wrapper: Wrapper,
  ctx: Context,
): { before: string; after: string } | null {
  const [first, ...rest] = wrapper.params;
  if (first === undefined) return null;
  const env = new Map<string, string>([[first.name, HOLE]]);
  for (const param of rest) {
    if (param.init === undefined) return null;
    const value = evaluate(param.init, ctx, env);
    if (value === null) return null;
    env.set(param.name, value);
  }
  const shell = evaluate(wrapper.body, ctx, env);
  if (shell === null) return null;
  const parts = shell.split(HOLE);
  return parts.length === 2 ? { before: parts[0], after: parts[1] } : null;
}

function operandsOf(expr: ts.Expression): ts.Expression[] {
  const node = unwrap(expr);
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return [...operandsOf(node.left), ...operandsOf(node.right)];
  }
  return [node];
}

const isInline = (node: ts.Expression): boolean =>
  ts.isStringLiteralLike(node) || ts.isTemplateExpression(node);

/**
 * Resolve a case's `code` initializer into its body and its harness.
 *
 * `file` keys each harness, so one harness used by forty cases is stored once.
 */
export function resolveCaseCode(
  initializer: ts.Expression,
  source: ts.SourceFile,
  file: string,
  cache: HarnessCache = {},
): ResolvedCase {
  cache.context ??= contextOf(source);
  const ctx = cache.context;
  const none = new Map<string, string>();
  const expr = unwrap(initializer);

  // A plain fragment: no harness at all.
  if (isInline(expr)) {
    const body = evaluate(expr, ctx, none);
    return body === null ? unresolved(expr, source, file) : { body };
  }

  // `local(fragment)`: a single-fragment wrapper declared in this file.
  if (
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.arguments.length === 1
  ) {
    const name = expr.expression.text;
    const wrapper = ctx.wrappers.get(name);
    const shell = wrapper ? shellOf(wrapper, ctx) : null;
    const inner = shell
      ? resolveCaseCode(expr.arguments[0], source, file, cache)
      : null;
    if (shell && inner && inner.body !== null && inner.harness === undefined) {
      return {
        body: inner.body,
        harness: { key: `${file}#${name}()`, value: shell },
      };
    }
  }

  // `CONST + fragment + CONST`: the fragment is the inline run in the middle.
  const operands = operandsOf(expr);
  const first = operands.findIndex(isInline);
  if (operands.length > 1 && first !== -1) {
    const last =
      operands.length - 1 - [...operands].reverse().findIndex(isInline);
    const values = operands.map((o) => evaluate(o, ctx, none));
    if (values.every((v): v is string => v !== null)) {
      const before = values.slice(0, first).join('');
      const after = values.slice(last + 1).join('');
      const body = values.slice(first, last + 1).join('');
      if (before === '' && after === '') return { body };
      const names = (list: ts.Expression[]) =>
        list.map((o) => o.getText(source)).join('+');
      return {
        body,
        harness: {
          key: `${file}#${names(operands.slice(0, first))}|${names(operands.slice(last + 1))}`,
          value: { before, after },
        },
      };
    }
  }

  // Anything else that evaluates whole: a const, a generator call with static
  // arguments. The whole code is the body; there is no separate harness.
  const whole = evaluate(expr, ctx, none);
  if (whole !== null) return { body: whole };

  return unresolved(expr, source, file);
}

/**
 * The harness a whole case ARRAY is passed through: `invalid: xp([...])`,
 * where `xp` maps every case to `{ ...c, code: asExpress(c.code) }`. The
 * cases inside the literal are fragments; the wrapper named in the mapper is
 * their harness. Returns null when the call is not that shape.
 */
export function arrayHarnessOf(
  call: ts.Expression,
  source: ts.SourceFile,
  file: string,
  cache: HarnessCache = {},
): { key: string; value: Harness } | null {
  const expr = unwrap(call);
  if (!ts.isCallExpression(expr) || !ts.isIdentifier(expr.expression))
    return null;
  cache.context ??= contextOf(source);
  const ctx = cache.context;
  const mapperName = expr.expression.text;
  let mapper: ts.Node | undefined = ctx.consts.get(mapperName);
  if (mapper === undefined) {
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === mapperName)
        mapper = node;
      else if (!mapper) ts.forEachChild(node, visit);
    };
    visit(source);
  }
  if (mapper === undefined) return null;
  let wrapperName: string | undefined;
  const find = (node: ts.Node): void => {
    if (
      !wrapperName &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'code'
    ) {
      const value = unwrap(node.initializer);
      if (ts.isCallExpression(value) && ts.isIdentifier(value.expression))
        wrapperName = value.expression.text;
    }
    ts.forEachChild(node, find);
  };
  find(mapper);
  if (wrapperName === undefined) return null;
  const wrapper = ctx.wrappers.get(wrapperName);
  const shell = wrapper ? shellOf(wrapper, ctx) : null;
  if (!shell) {
    return {
      key: `${file}#${mapperName}[]`,
      value: { unresolved: `${mapperName}(…) via ${wrapperName}` },
    };
  }
  return { key: `${file}#${wrapperName}()`, value: shell };
}

function unresolved(
  expr: ts.Expression,
  source: ts.SourceFile,
  file: string,
): ResolvedCase {
  const { line } = source.getLineAndCharacterOfPosition(expr.getStart(source));
  return {
    body: null,
    harness: {
      key: `${file}:${line + 1}`,
      value: { unresolved: expr.getText(source).slice(0, 200) },
    },
  };
}

/**
 * The code to lint for a ledger case: harness around body, or the body
 * alone. `null` when the case cannot be replayed from the ledger.
 */
export function replayCode(
  entry: { body?: string | null; harness?: string },
  harnesses: Record<string, Harness>,
): string | null {
  if (entry.body === undefined || entry.body === null) return null;
  if (entry.harness === undefined) return entry.body;
  const harness = harnesses[entry.harness];
  if (harness === undefined || 'unresolved' in harness) return null;
  return harness.before + entry.body + harness.after;
}
