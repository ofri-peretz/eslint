/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Which functions are MCP handlers, and which of their
 * parameters carries what the client sent — read once, for every taint rule.
 *
 * Every sink rule in this plugin asks the same first question: "is this value
 * something the model chose?". The answer starts at a handler parameter the
 * SDK fills from a request:
 *
 *   - `registerTool(name, config, cb)` / legacy `tool(...)`: `cb`'s first
 *     parameter is the tool arguments;
 *   - `setRequestHandler(CallToolRequestSchema | 'tools/call', cb)`: the
 *     arguments are `request.params.arguments`;
 *   - `registerResource(name, new ResourceTemplate(...), meta, cb)` / legacy
 *     `resource(name, template, [meta], cb)`: `cb(uri, variables)` — the
 *     template variables are parsed out of a URI the client chose.
 *
 * The request context (`extra`) is a separate root: it is where
 * `authInfo.token` — the caller's bearer token — reaches a handler, after the
 * arguments when the tool has an input schema and first when it has none.
 *
 * Handlers are recognised by the registration call, which is resolved through
 * the SDK's own exports (`CallToolRequestSchema`, `ResourceTemplate`) where a
 * method name alone would be ambiguous. Nothing is matched by variable name.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  propertyName,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';
import { isMcpModule } from './mcp-evidence';
import {
  constInitializer,
  isClosedSetSchema,
  readRegistration,
  resolveFunction,
  schemaFields,
  type ValueResolver,
} from './tool-registration';
import type { HandlerRoot } from './value-flow';

/** The request path, from a call-tool handler's parameter, to the arguments. */
const CALL_TOOL_ARGS_PATH = ['params', 'arguments'];

/** Resource registrations whose second argument is the URI or template. */
const RESOURCE_METHODS = new Set(['registerResource', 'resource']);

/** The MCP export a node resolves to (its last path segment), if any. */
export function mcpExport(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): string | undefined {
  const binding = resolveModuleBinding(node, scope);
  if (binding === undefined || !isMcpModule(binding.module)) return undefined;
  return binding.path[binding.path.length - 1];
}

/** Is `node` the SDK's call-tool request schema, or v2's `'tools/call'`? */
export function isCallToolMethod(
  node: TSESTree.Node | undefined,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node === undefined) return false;
  if (staticString(node) === 'tools/call') return true;
  return mcpExport(node, scope) === 'CallToolRequestSchema';
}

/** Is `node` a `new ResourceTemplate(...)` from the SDK, here or in a const? */
export function isResourceTemplate(
  node: TSESTree.Node | undefined,
  scope: TSESLint.Scope.Scope,
): boolean {
  const value =
    node?.type === 'Identifier' ? constInitializer(node, scope) : node;
  return (
    value?.type === 'NewExpression' &&
    mcpExport(value.callee, scope) === 'ResourceTemplate'
  );
}

/**
 * Which handler root a rule asks for.
 *
 *   - `arguments`: what the client sent — tool arguments and template variables.
 *   - `context`: the request context's `authInfo` (its `token` is the caller's
 *     bearer token).
 */
export type HandlerRole = 'arguments' | 'context';

export interface HandlerCollector {
  /** Handler function → the root its parameter receives. */
  roots: Map<TSESTree.Node, HandlerRoot>;
  /** Feed every CallExpression of the file through this. */
  visit(node: TSESTree.CallExpression): void;
}

const NO_KEYS: ReadonlySet<string> = new Set();

export function createHandlerCollector(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  resolve: ValueResolver,
  role: HandlerRole,
): HandlerCollector {
  const roots = new Map<TSESTree.Node, HandlerRoot>();
  const toContext = ['authInfo'];

  function visit(node: TSESTree.CallExpression): void {
    const scope = context.sourceCode.getScope(node);
    const registration = readRegistration(node, resolve);
    if (registration !== undefined) {
      const fn = resolveFunction(registration.handler, scope);
      if (fn === undefined) return;
      if (role === 'context') {
        // `cb(args, extra)` with a schema, `cb(extra)` without one; when the
        // schema cannot be read, only a second parameter is unambiguous.
        const { kind } = registration.schema;
        const param =
          kind === 'none'
            ? 0
            : kind === 'schema' || fn.params.length > 1
              ? 1
              : -1;
        if (param >= 0)
          roots.set(fn, { toArgs: toContext, closed: NO_KEYS, param });
        return;
      }
      const closed = new Set<string>();
      const fields =
        registration.schema.kind === 'schema'
          ? schemaFields(registration.schema.node)
          : undefined;
      for (const [key, value] of fields?.fields ?? []) {
        if (isClosedSetSchema(resolve(value) ?? value)) closed.add(key);
      }
      roots.set(fn, { toArgs: [], closed });
      return;
    }
    if (node.callee.type !== 'MemberExpression') return;
    const method = propertyName(node.callee);
    if (method === 'setRequestHandler') {
      if (!isCallToolMethod(node.arguments[0], scope)) return;
      const fn = resolveFunction(node.arguments[1], scope);
      if (fn === undefined) return;
      roots.set(
        fn,
        role === 'context'
          ? { toArgs: toContext, closed: NO_KEYS, param: 1 }
          : { toArgs: CALL_TOOL_ARGS_PATH, closed: NO_KEYS },
      );
      return;
    }
    if (method === null || !RESOURCE_METHODS.has(method)) return;
    if (!isResourceTemplate(node.arguments[1], scope)) return;
    const fn = resolveFunction(
      node.arguments[node.arguments.length - 1],
      scope,
    );
    if (fn === undefined) return;
    // `cb(uri, variables, extra)`.
    roots.set(fn, {
      toArgs: role === 'context' ? toContext : [],
      closed: NO_KEYS,
      param: role === 'context' ? 2 : 1,
    });
  }

  return { roots, visit };
}
