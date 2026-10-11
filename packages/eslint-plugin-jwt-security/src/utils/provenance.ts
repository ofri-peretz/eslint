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
import { AST_NODE_TYPES, propertyName } from '@interlace/eslint-devkit';
import {
  MAX_FLOW_DEPTH,
  calleeExportName,
  findVariable,
  originModule,
  resolveTerminal,
} from './value-flow';
import type { SourceCodeLike } from './value-flow';

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
  depth = 0,
): boolean {
  if (depth > MAX_FLOW_DEPTH) return false;
  const value = resolveTerminal(node, sourceCode);
  switch (value.type) {
    // A field of a back-channel value is back-channel too.
    case AST_NODE_TYPES.MemberExpression:
      return fromBackChannel(value.object, sourceCode, depth + 1);
    case AST_NODE_TYPES.CallExpression:
    case AST_NODE_TYPES.NewExpression:
      return isBackChannelCall(value, sourceCode, depth);
    case AST_NODE_TYPES.Identifier:
      return identifierFromBackChannel(value, sourceCode, depth);
    default:
      return false;
  }
}

function isBackChannelCall(
  call: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: SourceCodeLike,
  depth: number,
): boolean {
  const callee = call.callee;
  // `res.json()` reads the body of whatever `res` is.
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    BODY_READERS.has(String(propertyName(callee)))
  ) {
    return fromBackChannel(callee.object, sourceCode, depth + 1);
  }
  // The platform `fetch` — a global no binding in this file shadows.
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    callee.name === 'fetch' &&
    (findVariable(sourceCode, callee)?.defs ?? []).length === 0
  ) {
    return true;
  }
  const module = originModule(callee, sourceCode);
  if (module === null) return false;
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
    return fromBackChannel(def.node.init, sourceCode, depth + 1);
  }
  if (def?.type !== 'Parameter') return false;
  return everyCallSitePasses(def, sourceCode, depth);
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
      !fromBackChannel(argument, sourceCode, depth + 1)
    ) {
      return false;
    }
  }
  return sawCall;
}
