/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Back-channel provenance: did this value come from an HTTP response this
 * code requested itself?
 *
 * A token the client fetched from the authorization server — over TLS, on a
 * request it made — is not attacker-supplied: forging its signature would
 * first require being the server. A token that arrived IN a request (a body,
 * a header, a callback parameter) is exactly what an attacker hands you.
 * Field names cannot tell the two apart (`id_token` is posted by
 * `response_mode=form_post` too), so this reads where the value was MADE:
 *
 * - `await (await fetch(url)).json()` and `res.text()` on such a response,
 *   where `fetch` is the platform global or comes from a fetch package;
 * - any response of axios, got, ky or undici (`response.data`, `.json()`);
 * - an openid-client grant (`client.callback()`, `authorizationCodeGrant()`),
 *   but NOT `callbackParams()`, which parses the incoming request.
 *
 * Values are followed with `resolveTerminal`; a parameter is accepted only
 * when every call site in the file passes a back-channel value.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import {
  MAX_FLOW_DEPTH,
  calleeExportName,
  returnsOf,
  soleReturn,
  findVariable,
  originBinding,
  resolveTerminal,
} from './value-flow';
import type { SourceCodeLike } from './value-flow';
import { relativeExportModule, resolveSymbol } from './cross-file';
import type { CrossFileContext, ModuleRef } from './cross-file';

/** Packages whose every call result is a response to a request we made. */
const HTTP_CLIENT_PACKAGES: ReadonlySet<string> = new Set([
  'axios',
  'got',
  'ky',
  'undici',
  'node-fetch',
  'cross-fetch',
  'isomorphic-fetch',
]);

/** openid-client: a relying party's own calls to the authorization server. */
const OIDC_CLIENT_PACKAGE = 'openid-client';

/** openid-client exports that read the INCOMING request, not a response. */
const FRONT_CHANNEL_EXPORTS: ReadonlySet<string> = new Set(['callbackParams']);

/** Response methods that parse the body the response already holds. */
const BODY_READERS: ReadonlySet<string> = new Set(['json', 'text']);

/** Whether a value comes, structurally, from a back-channel HTTP response. */
export function fromBackChannel(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
  crossFile: CrossFileContext,
  depth = 0,
): boolean {
  if (depth > MAX_FLOW_DEPTH) return false;
  const value = resolveTerminal(node, sourceCode);
  switch (value.type) {
    // A field of a back-channel value is back-channel too.
    case AST_NODE_TYPES.MemberExpression:
      return (
        fromBackChannel(value.object, sourceCode, crossFile, depth + 1) ||
        unwrapsBackChannel(value, sourceCode, crossFile, depth)
      );
    case AST_NODE_TYPES.CallExpression:
      return (
        isBackChannelCall(value, sourceCode, crossFile, depth) ||
        unwrapsBackChannel(value, sourceCode, crossFile, depth)
      );
    case AST_NODE_TYPES.NewExpression:
      return isBackChannelCall(value, sourceCode, crossFile, depth);
    case AST_NODE_TYPES.Identifier:
      return identifierFromBackChannel(value, sourceCode, crossFile, depth);
    default:
      return false;
  }
}

function isBackChannelCall(
  call: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: SourceCodeLike,
  crossFile: CrossFileContext,
  depth: number,
): boolean {
  const callee = call.callee;
  // `res.json()` reads the body of whatever `res` is.
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    BODY_READERS.has(String(propertyName(callee)))
  ) {
    return fromBackChannel(callee.object, sourceCode, crossFile, depth + 1);
  }
  // `JSON.parse(body)` holds exactly what the body held.
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.object.name === 'JSON' &&
    propertyName(callee) === 'parse' &&
    isUnbound(sourceCode, callee.object)
  ) {
    const [text] = call.arguments;
    return (
      text !== undefined &&
      fromBackChannel(text, sourceCode, crossFile, depth + 1)
    );
  }
  // A module-level function declared to return a fetch `Response` —
  // `shopifyFetch(url): Promise<Response>` with Response from node-fetch.
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    isModuleLevel(sourceCode, callee)
  ) {
    const symbol = resolveSymbol(lintedModule(call, crossFile), callee.name);
    if (symbol?.kind === 'local' && returnsFetchResponse(symbol)) return true;
  }
  // The platform `fetch` — a global no binding in this file shadows.
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    callee.name === 'fetch' &&
    isUnbound(sourceCode, callee)
  ) {
    return true;
  }
  const origin = originBinding(callee, sourceCode);
  if (origin === null) return false;
  /*
   * A relative module is read across the file boundary: `const { client:
   * oidc } = require('./client')` where `./client` does
   * `exports.client = require('openid-client')` is an openid-client call.
   */
  const module =
    origin.source.startsWith('.') && origin.exportName !== null
      ? (relativeExportModule(
          crossFile.filename,
          origin.source,
          origin.exportName,
          crossFile.parser,
        ) ?? origin.source)
      : origin.source;
  const root = module.split('/')[0]!;
  if (HTTP_CLIENT_PACKAGES.has(root)) return true;
  return (
    root === OIDC_CLIENT_PACKAGE &&
    !FRONT_CHANNEL_EXPORTS.has(String(calleeExportName(callee, sourceCode)))
  );
}

function identifierFromBackChannel(
  node: TSESTree.Identifier,
  sourceCode: SourceCodeLike,
  crossFile: CrossFileContext,
  depth: number,
): boolean {
  const def = findVariable(sourceCode, node)?.defs[0];
  // `const { body } = await request(url)`: the destructure could not be read
  // as an object literal, but the whole it was taken from can be traced.
  if (
    def?.type === 'Variable' &&
    def.node.id.type !== AST_NODE_TYPES.Identifier &&
    def.node.init !== null
  ) {
    return fromBackChannel(def.node.init, sourceCode, crossFile, depth + 1);
  }
  if (def?.type !== 'Parameter') return false;
  return everyCallSitePasses(def, sourceCode, crossFile, depth);
}

/**
 * For a parameter, look at how the enclosing function is actually called.
 *
 * Conservative on purpose: an unnamed function, a function with no call site
 * in this file, or a single call site that passes something else all mean
 * "not proven". Nothing here reasons across files, so an exported helper is
 * never exempted by this path.
 */
function everyCallSitePasses(
  def: TSESLint.Scope.Definition,
  sourceCode: SourceCodeLike,
  crossFile: CrossFileContext,
  depth: number,
): boolean {
  // `indexOf` misses for a destructured parameter, and `id` is absent on an
  // arrow or an anonymous function — both mean "cannot locate the callers".
  const fn = def.node as TSESTree.FunctionDeclaration;
  const index = fn.params.indexOf(def.name as TSESTree.Parameter);
  if (index < 0 || fn.id === null) return false;
  // A named function always has a binding in an enclosing scope.
  const fnVariable = findVariable(sourceCode, fn.id)!;
  let sawCall = false;
  for (const reference of fnVariable.references) {
    const parent = reference.identifier.parent!;
    if (
      parent.type !== AST_NODE_TYPES.CallExpression ||
      parent.callee !== reference.identifier
    ) {
      continue;
    }
    sawCall = true;
    const argument = parent.arguments[index];
    if (
      argument === undefined ||
      !fromBackChannel(argument, sourceCode, crossFile, depth + 1)
    ) {
      return false;
    }
  }
  return sawCall;
}

/** A platform global: no binding in this file shadows it. */
function isUnbound(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): boolean {
  return (findVariable(sourceCode, node)?.defs ?? []).length === 0;
}

/** A name bound at module scope (or not at all), where `resolveSymbol` reads. */
function isModuleLevel(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): boolean {
  const scope = findVariable(sourceCode, node)?.scope.type;
  return scope === 'module' || scope === 'global';
}

/** The linted file as a module of the project. */
function lintedModule(
  node: TSESTree.Node,
  crossFile: CrossFileContext,
): ModuleRef {
  let root: TSESTree.Node = node;
  while (root.parent) root = root.parent;
  return {
    program: root as TSESTree.Program,
    filename: crossFile.filename,
    parser: crossFile.parser,
  };
}

/** Packages whose `Response` is the response of an HTTP request made. */
const FETCH_RESPONSE_PACKAGES: ReadonlySet<string> = new Set([
  'node-fetch',
  'undici',
  'cross-fetch',
  'isomorphic-fetch',
]);

/**
 * Whether a function is DECLARED to return a fetch `Response`.
 *
 * `Promise<Response>` / `Response`, where `Response` is imported from a fetch
 * package — or is the platform's own, bound by nothing in that module. A
 * return-type annotation is the function's structure, the same evidence a
 * typed member gives.
 */
function returnsFetchResponse(
  symbol: Extract<ResolvedSymbolLike, { kind: 'local' }>,
): boolean {
  let type = (symbol.node as { returnType?: TSESTree.TSTypeAnnotation })
    .returnType?.typeAnnotation;
  if (
    type?.type === AST_NODE_TYPES.TSTypeReference &&
    type.typeName.type === AST_NODE_TYPES.Identifier &&
    type.typeName.name === 'Promise'
  ) {
    type = type.typeArguments?.params[0];
  }
  if (
    type?.type !== AST_NODE_TYPES.TSTypeReference ||
    type.typeName.type !== AST_NODE_TYPES.Identifier
  ) {
    return false;
  }
  const resolved = resolveSymbol(symbol.module, type.typeName.name);
  if (resolved === null) return type.typeName.name === 'Response';
  return (
    resolved.kind === 'external' &&
    FETCH_RESPONSE_PACKAGES.has(resolved.source.split('/')[0]!)
  );
}

type ResolvedSymbolLike = NonNullable<ReturnType<typeof resolveSymbol>>;

/**
 * A result wrapper, read from its definition: `ok(v)` builds `new Ok(v)`, and
 * `Ok`'s constructor stores its first argument as a field.
 */
interface Wrapper {
  readonly cls: TSESTree.ClassDeclaration;
  readonly field: string;
  readonly module: ModuleRef;
  /** The expression wrapped — the factory's / constructor's first argument. */
  readonly arg: TSESTree.Node | null;
}

function wrapperOf(expr: TSESTree.Node, module: ModuleRef): Wrapper | null {
  if (
    (expr.type !== AST_NODE_TYPES.CallExpression &&
      expr.type !== AST_NODE_TYPES.NewExpression) ||
    expr.callee.type !== AST_NODE_TYPES.Identifier
  ) {
    return null;
  }
  const arg = expr.arguments[0] ?? null;
  let construction: TSESTree.Node = expr;
  let where = module;
  // `ok(v)` -> the factory's `new Ok(v)`, with `v` its own first parameter.
  if (expr.type === AST_NODE_TYPES.CallExpression) {
    const factory = resolveSymbol(module, expr.callee.name);
    if (factory?.kind !== 'local') return null;
    const built = soleReturn(factory.node);
    if (
      built?.type !== AST_NODE_TYPES.NewExpression ||
      built.arguments[0]?.type !== AST_NODE_TYPES.Identifier
    ) {
      return null;
    }
    // `soleReturn` answered, so the factory is a function.
    const [param] = (
      factory.node as
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ).params;
    if (
      (param as TSESTree.Identifier | undefined)?.name !==
      built.arguments[0].name
    ) {
      return null;
    }
    construction = built;
    where = factory.module;
  }
  const cls = resolveSymbol(
    where,
    ((construction as TSESTree.NewExpression).callee as TSESTree.Identifier)
      .name,
  );
  if (
    cls?.kind !== 'local' ||
    cls.node.type !== AST_NODE_TYPES.ClassDeclaration
  ) {
    return null;
  }
  const ctor = cls.node.body.body.find(
    (member) =>
      member.type === AST_NODE_TYPES.MethodDefinition &&
      member.kind === 'constructor',
  ) as TSESTree.MethodDefinition | undefined;
  const first = ctor?.value.params[0];
  if (first?.type !== AST_NODE_TYPES.TSParameterProperty) return null;
  return {
    cls: cls.node,
    // TypeScript admits only an identifier (optionally defaulted) there.
    field: (first.parameter as TSESTree.Identifier).name,
    module: cls.module,
    arg,
  };
}

/** `this.<field>`. */
function isThisField(node: TSESTree.Node | null, field: string): boolean {
  return (
    node?.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.ThisExpression &&
    propertyName(node) === field
  );
}

interface Step {
  readonly call: boolean;
  readonly name: string;
}

/**
 * Apply `.value` / `.mapError(h).valueOrBug()` to one wrapped return.
 *
 * - a Node: the wrapped value comes out (the argument `ok()` was given);
 * - `nothing`: this wrapper yields no value on that path — its class has no
 *   such member (`Err` has no `value`) or the method only throws;
 * - `unknown`: anything the class does not show plainly.
 */
function applySteps(
  returned: TSESTree.Node,
  steps: readonly Step[],
  module: ModuleRef,
): TSESTree.Node | 'nothing' | 'unknown' {
  let wrapper = wrapperOf(returned, module);
  // The value we follow; null once a re-wrap wraps something else.
  let value = wrapper?.arg ?? null;
  for (const [index, step] of steps.entries()) {
    if (wrapper === null) return 'unknown';
    const yields = index === steps.length - 1 && value !== null;
    const member = wrapper.cls.body.body.find(
      (element) =>
        (element.type === AST_NODE_TYPES.MethodDefinition ||
          element.type === AST_NODE_TYPES.PropertyDefinition) &&
        objectKeyName(element) === step.name,
    );
    if (!step.call) {
      if (step.name === wrapper.field) return yields ? value! : 'unknown';
      return member === undefined ? 'nothing' : 'unknown';
    }
    if (member?.type !== AST_NODE_TYPES.MethodDefinition) return 'unknown';
    const returns = returnsOf(member.value.body!);
    if (returns.length === 0) return 'nothing';
    if (returns.length > 1) return 'unknown';
    const result = returns[0]!.argument;
    if (isThisField(result, wrapper.field)) return yields ? value! : 'unknown';
    // `return ok(this.value)` re-wraps the same value; `err(mapper(...))`
    // wraps something else, whose value is no longer the one we follow.
    const next = result === null ? null : wrapperOf(result, wrapper.module);
    value = isThisField(next?.arg ?? null, wrapper.field) ? value : null;
    wrapper = next;
  }
  return 'unknown';
}

/**
 * A value unwrapped from a same-file function's Result.
 *
 * `tokenResult.value` / `tokenResult.mapError(h).valueOrBug()` where
 * `tokenResult = await tokenRequest(…)` and `tokenRequest` returns
 * `ok(payload)` or `err(…)`. Every return is unwrapped through the wrapper's
 * own class; every path that yields a value must yield a back-channel one,
 * and at least one must.
 */
function unwrapsBackChannel(
  node: TSESTree.MemberExpression | TSESTree.CallExpression,
  sourceCode: SourceCodeLike,
  crossFile: CrossFileContext,
  depth: number,
): boolean {
  const steps: Step[] = [];
  let base: TSESTree.Node = node;
  for (;;) {
    if (base.type === AST_NODE_TYPES.MemberExpression) {
      steps.unshift({ call: false, name: String(propertyName(base)) });
      base = base.object;
    } else if (
      base.type === AST_NODE_TYPES.CallExpression &&
      base.callee.type === AST_NODE_TYPES.MemberExpression
    ) {
      steps.unshift({ call: true, name: String(propertyName(base.callee)) });
      base = base.callee.object;
    } else {
      break;
    }
  }
  const producer = resolveTerminal(base, sourceCode);
  if (
    steps.length === 0 ||
    (producer.type !== AST_NODE_TYPES.CallExpression &&
      producer.type !== AST_NODE_TYPES.NewExpression)
  ) {
    return false;
  }
  // A same-file function's returns, or the wrapper itself when the value
  // was built in place (`new Ok(body)`, `ok(body)`).
  const fn =
    producer.type === AST_NODE_TYPES.CallExpression
      ? resolveTerminal(producer.callee, sourceCode)
      : producer;
  const returned =
    fn.type !== AST_NODE_TYPES.FunctionDeclaration &&
    fn.type !== AST_NODE_TYPES.FunctionExpression &&
    fn.type !== AST_NODE_TYPES.ArrowFunctionExpression
      ? [producer]
      : // An expression-bodied function never reaches here: its single
        // return is already followed by `resolveTerminal`.
        returnsOf(fn.body).map((statement) => statement.argument);
  const module = lintedModule(node, crossFile);
  let yielded = 0;
  for (const value of returned) {
    const out = value === null ? 'nothing' : applySteps(value, steps, module);
    if (out === 'nothing') continue;
    if (
      out === 'unknown' ||
      !fromBackChannel(out, sourceCode, crossFile, depth + 1)
    ) {
      return false;
    }
    yielded++;
  }
  return yielded > 0;
}
