/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this value an inbound HTTP request payload — decided from structure?
 *
 * The mass-assignment detector used to recognise a request by the NAME of the
 * object the payload was read from (`req`, `request`, `ctx`, `context`,
 * `event`). Renaming the handler's parameter to anything else silenced it.
 * What actually marks a request is where the object comes from:
 *
 *   - `p.body`, `p.query`, `p.params` — and Koa's `p.request.body` — where
 *     `p` is a function PARAMETER (a handler receives its request as one), or
 *     a name the file never declares;
 *   - `await p.json()` / `await p.formData()` on such a parameter (the Fetch
 *     `Request` every Next.js / Remix / Hono handler receives), and
 *     `Object.fromEntries(…)` / `JSON.parse(…)` of one;
 *   - a parameter decorated with a framework's own `@Body()` / `@Query()` /
 *     `@Param()`, resolved through its import;
 *   - a handler parameter destructured as `({ body })`;
 *   - a local binding written once from any of the above, including the
 *     `...rest` of a destructured payload.
 *
 * The property names are the frameworks' API (Express, Koa, Fastify, Lambda
 * proxy events), not a guess about what a variable is called.
 */
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { objectKeyName, propertyName } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';
import {
  type Env,
  MAX_FOLLOW_DEPTH,
  importSpecifierOf,
  lookup,
  singleWrite,
} from './value-follow';

/** Request members that carry caller-controlled data. */
const PAYLOAD_PROPERTIES: ReadonlySet<string> = new Set([
  'body',
  'query',
  'params',
  // Hapi's spelling of `body`.
  'payload',
]);

/** Fetch `Request` readers that resolve to the caller's body. */
const BODY_READERS: ReadonlySet<string> = new Set(['json', 'formData']);

/** Parameter decorators that inject the request payload, by framework. */
const PAYLOAD_DECORATORS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['@nestjs/common', new Set(['Body', 'Query', 'Param'])],
  ['routing-controllers', new Set(['Body', 'QueryParams', 'Params'])],
]);

/** Is this name the runtime global — no binding in the file, or a TS lib one? */
export function isGlobal(node: TSESTree.Identifier, env: Env): boolean {
  const variable = lookup(node.name, env.scopeOf(node));
  return variable === null || variable.defs.length === 0;
}

/**
 * Is `node` a binding that holds a request — a parameter, or a name with no
 * declaration in the file — or a value read from one (`ctx.request`)?
 */
function isRequestHolder(
  node: TSESTree.Node,
  env: Env,
  depth: number,
): boolean {
  if (depth > MAX_FOLLOW_DEPTH) return false;
  const holder = unwrapTypeSyntax(node);
  if (holder.type === AST_NODE_TYPES.MemberExpression) {
    // Koa: `ctx.request.body`
    return (
      propertyName(holder) === 'request' &&
      isRequestHolder(holder.object, env, depth + 1)
    );
  }
  if (holder.type !== AST_NODE_TYPES.Identifier) return false;
  const variable = lookup(holder.name, env.scopeOf(holder));
  if (variable === null) return true;
  if (variable.defs[0]?.type === 'Parameter') return true;
  const written = singleWrite(variable);
  return written !== null && isRequestHolder(written, env, depth + 1);
}

/** Does a decorator on this parameter inject the request payload? */
export function hasPayloadDecorator(param: TSESTree.Node, env: Env): boolean {
  const decorators = (param as { decorators?: TSESTree.Decorator[] })
    .decorators;
  return (decorators ?? []).some((decorator) => {
    const call = decorator.expression;
    if (
      call.type !== AST_NODE_TYPES.CallExpression ||
      call.callee.type !== AST_NODE_TYPES.Identifier
    ) {
      return false;
    }
    const variable = lookup(call.callee.name, env.scopeOf(call.callee));
    const specifier = variable === null ? null : importSpecifierOf(variable);
    return (
      specifier !== null &&
      PAYLOAD_DECORATORS.get(specifier.source)?.has(specifier.name) === true
    );
  });
}

/** Is this identifier bound to a request payload? */
function isPayloadBinding(
  node: TSESTree.Identifier,
  env: Env,
  depth: number,
): boolean {
  const variable = lookup(node.name, env.scopeOf(node));
  if (variable === null) return false;
  const def = variable.defs[0];
  const id = variable.identifiers[0];
  if (def?.type === 'Parameter') {
    if (hasPayloadDecorator(id, env)) return true;
    // `({ body }) => …` — the handler's request, destructured in the signature.
    const parent = id.parent;
    return (
      parent?.type === AST_NODE_TYPES.Property &&
      parent.value === id &&
      parent.parent.type === AST_NODE_TYPES.ObjectPattern &&
      PAYLOAD_PROPERTIES.has(objectKeyName(parent) ?? '')
    );
  }
  if (def?.type !== 'Variable') return false;
  // `const { id, ...rest } = req.body` — the rest is the payload minus `id`.
  if (
    id.parent?.type === AST_NODE_TYPES.RestElement &&
    id.parent.parent?.type === AST_NODE_TYPES.ObjectPattern &&
    def.node.init !== null
  ) {
    return isRequestPayload(def.node.init, env, depth + 1);
  }
  const written = singleWrite(variable);
  return (
    written !== null &&
    written !== node &&
    def.node.id.type === AST_NODE_TYPES.Identifier &&
    isRequestPayload(written, env, depth + 1)
  );
}

/** Is `node` the whole request payload — not one field of it? */
export function isRequestPayload(
  node: TSESTree.Node,
  env: Env,
  depth = 0,
): boolean {
  if (depth > MAX_FOLLOW_DEPTH) return false;
  const value = unwrapTypeSyntax(node);
  switch (value.type) {
    case AST_NODE_TYPES.AwaitExpression:
      return isRequestPayload(value.argument, env, depth + 1);
    case AST_NODE_TYPES.Identifier:
      return isPayloadBinding(value, env, depth);
    case AST_NODE_TYPES.MemberExpression:
      return (
        PAYLOAD_PROPERTIES.has(propertyName(value) ?? '') &&
        isRequestHolder(value.object, env, depth + 1)
      );
    case AST_NODE_TYPES.CallExpression: {
      const callee = value.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const method = propertyName(callee) ?? '';
      // `await request.json()` / `await request.formData()`
      if (BODY_READERS.has(method) && value.arguments.length === 0)
        return isRequestHolder(callee.object, env, depth + 1);
      // `Object.fromEntries(form)` / `JSON.parse(event.body)` — the payload,
      // re-shaped but not narrowed.
      const [first] = value.arguments;
      return (
        callee.object.type === AST_NODE_TYPES.Identifier &&
        isGlobal(callee.object, env) &&
        ((callee.object.name === 'Object' && method === 'fromEntries') ||
          (callee.object.name === 'JSON' && method === 'parse')) &&
        first !== undefined &&
        isRequestPayload(first, env, depth + 1)
      );
    }
    default:
      return false;
  }
}
