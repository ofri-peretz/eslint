/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * One thing, written several ways.
 *
 * JavaScript spells a constant string two ways and a property name three, and
 * a rule that reads only the common spelling of each sees a strict subset of
 * its own subject. That is not a judgement call the rule made — it is what
 * `node.type === 'Literal'` means when the grammar also allows a template
 * literal, and it is invisible in review because the test suite is written in
 * the same spelling as the rule.
 *
 * Measured across this repository in 2026-08: 3,825 meaning-preserving
 * rewrites of known true positives produced **1,156 cases where the rule
 * reported the original and went silent on the rewrite**, across 163 of 470
 * rules. Not one of them was a decision anybody made.
 *
 * The spellings that matter, and why each is not exotic:
 *
 *   'x'  vs  `x`          a no-substitution template literal IS a string
 *                         constant. Prettier leaves them, codegen emits them,
 *                         and `String.raw` requires them.
 *   o.k  vs  o['k']       the same property. Minifiers, obfuscators and any
 *                         key that is not a valid identifier use the second.
 *   {k:v} vs {['k']:v}    the same declaration, and what a spread-with-
 *                         conditional lowers to.
 *
 * Reach for these instead of matching a node type directly whenever the rule
 * cares about WHICH string or WHICH property, not about how it was written.
 * When a rule genuinely means "a quoted literal and nothing else", match the
 * node type and say why in a comment — that is a position, and positions are
 * fine. Silence by omission is not.
 */
import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
// The shim, not the package: `@typescript-eslint/utils` is an OPTIONAL peer,
// so a runtime import of it makes devkit unloadable wherever the consumer did
// not install it. Only the type import above may name the package.
import { AST_NODE_TYPES } from '../ast-node-types';

/**
 * The string a node names, in either spelling, or `null` if it does not name
 * one statically.
 *
 * A template literal with expressions is deliberately `null`: `` `a${b}` ``
 * has no single value, and guessing one is the data-flow question a
 * type-unaware rule does not ask.
 */
export function staticString(
  node: TSESTree.Node | null | undefined,
): string | null {
  if (!node) return null;
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    node.expressions.length === 0
  ) {
    // Exactly one quasi, always — a template with nothing to interpolate cannot
    // be split into more.
    //
    // `cooked` IS nullable, as of @typescript-eslint 8.68.0. It was typed
    // `string` and emitted the raw text for an escape it could not cook;
    // 8.68.0 types it `string | null` and emits `null`. The comment that stood
    // here said the parser never nulls it and a fallback would be unreachable —
    // true when written, false the moment the parser bumped, and silent either
    // way because `string | null` is assignable to this function's return type.
    //
    // `?? raw` restores exactly what every caller received before the bump.
    const [only] = node.quasis as [TSESTree.TemplateElement];
    return only.value.cooked ?? only.value.raw;
  }
  return null;
}

/** Whether a node names this exact string, however it is spelled. */
export const isStaticString = (
  node: TSESTree.Node | null | undefined,
  value: string,
): boolean => staticString(node) === value;

/**
 * The property a member expression reads — `o.k`, `o['k']` and `` o[`k`] ``
 * all return `'k'`.
 *
 * A computed key that is not a static string returns `null`: `o[k]` is decided
 * at runtime, and which property it names is not a question the AST answers.
 */
export function propertyName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed) {
    return node.property.type === AST_NODE_TYPES.Identifier
      ? node.property.name
      : null;
  }
  return staticString(node.property);
}

/**
 * The key an object property declares — `{ k: v }`, `{ 'k': v }` and
 * `{ ['k']: v }` all return `'k'`.
 *
 * Numeric keys come back as their source text, so `{ 200: v }` is `'200'` —
 * `obj[200]` and `obj['200']` are the same property in JavaScript, and a rule
 * matching on names should see them as one.
 */
export function objectKeyName(
  node:
    TSESTree.Property | TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
): string | null {
  const key = node.key;
  if (!node.computed && key.type === AST_NODE_TYPES.Identifier) return key.name;
  if (key.type === AST_NODE_TYPES.Literal && typeof key.value === 'number')
    return String(key.value);
  return staticString(key);
}

/**
 * The dotted path a member chain spells, root first, or `null` if any link is
 * not statically nameable. `crypto['createHash']` and `crypto.createHash`
 * both give `['crypto', 'createHash']`.
 */
export function memberPath(node: TSESTree.Node): string[] | null {
  if (node.type === AST_NODE_TYPES.Identifier) return [node.name];
  if (node.type !== AST_NODE_TYPES.MemberExpression) return null;
  const head = memberPath(node.object);
  if (head === null) return null;
  const tail = propertyName(node);
  return tail === null ? null : [...head, tail];
}

/**
 * The properties a web request exposes caller-supplied data on.
 *
 * These names ARE a contract: Express, Koa, Fastify and the Lambda proxy
 * integration all publish them. The RECEIVER's name is not — Express never
 * required the parameter be called `req`, and `(request, response) => …` is
 * ordinary code.
 */
const REQUEST_SHAPE: ReadonlySet<string> = new Set([
  'query',
  'params',
  'headers',
  'cookies',
  'queryStringParameters',
  'pathParameters',
  'multiValueHeaders',
]);

/**
 * `body` is a request property and also the commonest property name in this
 * ecosystem: every AST node has one, and so does every HTTP RESPONSE.
 *
 * `function visit(node) { … node.body … }` is an AST visitor, and treating it
 * as a request read reported the linter's own source. So `body` qualifies only
 * when something is read OUT of it — `x.body.url` is a request field,
 * `x.body` on its own is as likely a statement list.
 */
const REQUEST_SHAPE_NEEDS_DEPTH: ReadonlySet<string> = new Set(['body']);

/**
 * Does this expression read caller-supplied data off a request?
 *
 * Decided from the SHAPE, not the receiver's name. Rules here matched
 * `['req', 'request', 'ctx', 'event']` on the root identifier, so a codebase
 * writing `(inbound, outbound) => …` — or the very common TypeScript
 * `(request: Request, response: Response)` — got nothing at all from
 * `no-sql-injection`, `no-ssrf` and `no-insecure-redirects`. Measured with
 * `scripts/name-dependence-probe.mts`.
 *
 * The receiver must be a FUNCTION PARAMETER. That is what keeps `config.params`
 * and `node.body` out: a request arrives as an argument, and a module-local
 * object with a `.body` is somebody's own data structure. Requiring the
 * parameter is a structural fact, and it is the part the old name test was
 * standing in for.
 *
 * @example
 * ```ts
 * readsRequestShape(node, context.sourceCode); // inbound.query.id -> true
 * ```
 */
export interface RequestShapeOptions {
  /**
   * Whether a bare `.body` needs a second level before it counts. Default
   * `true`.
   *
   * `body` is both a request property and the commonest property name in this
   * ecosystem — `node.body`, `response.body`, `message.body` — so at depth 1
   * it is too ambiguous to act on, and every caller so far wanted the strict
   * reading.
   *
   * A caller may turn it off when the POSITION already supplies the meaning.
   * `db.collection('u').find(req.body)` is one: the whole request body used as
   * a Mongo filter document is the canonical NoSQL authentication bypass
   * (`{"$ne": null}` as a password matches every user), and nobody passes an
   * arbitrary `.body` there by accident. See ILB-0121.
   */
  bodyNeedsDepth?: boolean;
}

export function readsRequestShape(
  node: TSESTree.Node,
  sourceCode: { getScope: (node: TSESTree.Node) => TSESLint.Scope.Scope },
  options: RequestShapeOptions = {},
): boolean {
  // Walk to the root of the member chain, remembering the property that sat
  // directly on it — `a.query.id` asks about `query`, not `id`.
  let current: TSESTree.Node = node;
  let firstProperty: string | null = null;
  let secondProperty: string | null = null;
  let depth = 0;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    const name = propertyName(current);
    if (name !== null) {
      secondProperty = firstProperty;
      firstProperty = name;
    }
    depth += 1;
    current = current.object;
  }
  if (current.type !== AST_NODE_TYPES.Identifier) return false;
  if (firstProperty === null) return false;

  // Koa nests the real request one level down: `ctx.request.body` and
  // `ctx.request.query` are its documented API, and `ctx.req` is the raw Node
  // request. Stopping at the property nearest the root reads `request` there,
  // which is in neither set, so every Koa handler in the corpus came back
  // false — a false negative that has nothing to do with how anything was
  // named. Step over that one link and ask the same question of what follows.
  if (
    (firstProperty === 'request' || firstProperty === 'req') &&
    secondProperty !== null
  ) {
    firstProperty = secondProperty;
    depth -= 1;
  }
  const known = REQUEST_SHAPE.has(firstProperty);
  const needsDepth = REQUEST_SHAPE_NEEDS_DEPTH.has(firstProperty);
  if (!known && !needsDepth) return false;
  if (needsDepth && (options.bodyNeedsDepth ?? true) && depth < 2) return false;

  const scope = sourceCode.getScope(current);
  for (let s: TSESLint.Scope.Scope | null = scope; s !== null; s = s.upper) {
    const variable = s.set.get(current.name);
    if (variable === undefined) continue;
    return variable.defs.some((d) => d.type === 'Parameter');
  }
  return false;
}

/**
 * Whether a name that may not have resolved is one of a known set.
 *
 * `propertyName` returns `string | null` so that "this property is not
 * statically nameable" — `o[k]`, `` o[`a${b}`] `` — stays visible. Casting
 * that away with `namesOneOf(propertyName(node), SET)` works, because
 * `Set.prototype.has(null)` is false, but it spells "the rule abstained" and
 * "the name is absent from the set" identically, and it lies to the type
 * system about a value the AST genuinely may not supply.
 *
 * Use this where the membership test reads better as one expression, and an
 * explicit `name !== null && …` where the resolved name is needed afterwards.
 *
 * @example
 * ```ts
 * if (namesOneOf(propertyName(callee), HTTP_METHODS)) { … }
 * ```
 */
export const namesOneOf = (
  name: string | null,
  names: ReadonlySet<string> | readonly string[],
): boolean =>
  name !== null &&
  (Array.isArray(names)
    ? names.includes(name)
    : (names as ReadonlySet<string>).has(name));

/**
 * The property a node reads, or `null` if it does not read one at all.
 *
 * `propertyName` takes a `MemberExpression`, so a caller holding an arbitrary
 * node has to test the type first — and that test is usually already sitting
 * in a boolean chain the caller cannot restructure:
 *
 * a chain the caller cannot split — istanbul counts an `&&` operand as
 * covered once it is EVALUATED, so a type test that is never false there
 * looks covered, and promoting it to its own statement exposes an arm no
 * test reaches. Resolving once, before the chain, leaves the chain intact:
 * it gets a binding to test, and the body gets a narrowed `string` — no
 * second call, and no cast standing in for a question already answered.
 *
 * @example
 * ```ts
 * const method = memberPropertyName(callee);
 * if (callee.type !== 'MemberExpression' || method === null) return;
 * method.toLowerCase(); // string
 * ```
 */
export const memberPropertyName = (
  node: TSESTree.Node | null | undefined,
): string | null =>
  node != null && node.type === AST_NODE_TYPES.MemberExpression
    ? propertyName(node)
    : null;
