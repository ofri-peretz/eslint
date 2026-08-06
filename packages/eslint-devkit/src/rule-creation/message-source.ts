/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Which untrusted message source does a handler belong to?
 *
 * `browser-security` ships a generic sink rule (`no-innerhtml`, `no-eval`) plus
 * one rule per known-untrusted source (`no-websocket-innerhtml`,
 * `no-worker-message-innerhtml`, `no-filereader-innerhtml`,
 * `no-postmessage-innerhtml`). Both kinds of rule are in `recommended` at
 * `error`, and before this module every source rule gated only on the *handler
 * shape* — `X.onmessage = fn` — never on what `X` was. Two things followed, both
 * measured on the shipped tarball:
 *
 *   1. `document.body.innerHTML = event.data` inside a WebSocket handler was
 *      reported at the identical range by `no-innerhtml` AND
 *      `no-websocket-innerhtml`. Four of the five source shapes double-reported;
 *      the Worker one reported three times.
 *   2. `no-websocket-innerhtml` fired on `postMessage` and Worker handlers,
 *      because they are also `X.onmessage`. The finding said "WebSocket message
 *      data" and cited the WebSocket MDN page for code containing no WebSocket.
 *
 * The ownership rule this module implements: **a source rule fires only on a
 * positively identified source; the generic rule owns everything else.** An
 * unresolvable receiver is not "probably a WebSocket" — it is unknown, and
 * unknown belongs to the generic rule, which reports it without claiming a
 * provenance it cannot prove.
 *
 * Resolution is name-based and single-scope, the same tactic the SQL taint
 * helpers use: a `new WebSocket(...)` initialiser binds the name for the file.
 * A receiver that arrives as a parameter or from another module stays
 * `undefined` — deliberately, per the rule above.
 */

import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESTree } from '@typescript-eslint/utils';

/** A source whose messages are attacker-influenced, and which owns its own rule. */
export type MessageSource =
  'websocket' | 'worker' | 'filereader' | 'postmessage';

/** Constructor name -> the source that owns handlers on it. */
const CONSTRUCTORS: ReadonlyMap<string, MessageSource> = new Map([
  ['WebSocket', 'websocket'],
  ['Worker', 'worker'],
  ['SharedWorker', 'worker'],
  ['FileReader', 'filereader'],
]);

/** Receivers on which `addEventListener('message')` is a postMessage listener. */
const POSTMESSAGE_RECEIVERS = new Set([
  'window',
  'self',
  'globalThis',
  'parent',
  'top',
]);

/**
 * Map every `const x = new WebSocket()` style binding in the file to its source.
 *
 * Built once per file. Hoisting is not modelled: a handler attached above the
 * construction still resolves, because the map is complete before any handler
 * is judged.
 */
export function collectSourceBindings(
  program: TSESTree.Program,
): Map<string, MessageSource> {
  const bindings = new Map<string, MessageSource>();

  walk(program, (node) => {
    if (node.type !== AST_NODE_TYPES.VariableDeclarator) return;
    if (node.id.type !== AST_NODE_TYPES.Identifier) return;
    const source = constructedSource(node.init ?? undefined);
    if (source !== undefined) bindings.set(node.id.name, source);
  });

  return bindings;
}

/** The source a `new X()` expression constructs, if X is one we own a rule for. */
export function constructedSource(
  node: TSESTree.Node | undefined,
): MessageSource | undefined {
  if (node === undefined || node.type !== AST_NODE_TYPES.NewExpression)
    return undefined;
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return undefined;
  return CONSTRUCTORS.get(node.callee.name);
}

/**
 * The source of a receiver expression — `ws` in `ws.onmessage = …`.
 *
 * Resolves an identifier through the file's bindings, and an inline
 * `new WebSocket().onmessage = …` directly. Anything else is unknown.
 */
export function receiverSource(
  receiver: TSESTree.Node,
  bindings: ReadonlyMap<string, MessageSource>,
): MessageSource | undefined {
  if (receiver.type === AST_NODE_TYPES.Identifier) {
    if (POSTMESSAGE_RECEIVERS.has(receiver.name)) return 'postmessage';
    return bindings.get(receiver.name);
  }
  return constructedSource(receiver);
}

/**
 * The source whose handler this node is, if it is a message-handler attachment.
 *
 * Covers both attachment shapes:
 *   `ws.onmessage = (e) => …`            (AssignmentExpression)
 *   `ws.addEventListener('message', fn)` (CallExpression)
 *   `reader.onload = (e) => …`           (FileReader's event name)
 *
 * Returns the source, the handler's first parameter name (what the sink rules
 * match `event.data` against) and the handler function itself, whose range is
 * the region the payload is in scope for. `undefined` means "not a handler, or
 * a handler on a receiver this file cannot identify".
 */
export function handlerSource(
  node: TSESTree.Node,
  bindings: ReadonlyMap<string, MessageSource>,
):
  | { source: MessageSource; eventParam: string; handler: TSESTree.Node }
  | undefined {
  if (node.type === AST_NODE_TYPES.AssignmentExpression) {
    if (node.left.type !== AST_NODE_TYPES.MemberExpression) return undefined;
    if (node.left.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    const source = receiverSource(node.left.object, bindings);
    if (source === undefined) return undefined;
    if (!HANDLER_PROPS[source].has(node.left.property.name)) return undefined;
    return withHandler(source, node.right);
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return undefined;
    if (node.callee.property.type !== AST_NODE_TYPES.Identifier)
      return undefined;
    if (node.callee.property.name !== 'addEventListener') return undefined;
    const [eventType, handler] = node.arguments;
    if (eventType?.type !== AST_NODE_TYPES.Literal) return undefined;
    if (typeof eventType.value !== 'string') return undefined;
    const source = receiverSource(node.callee.object, bindings);
    if (source === undefined) return undefined;
    if (!HANDLER_EVENTS[source].has(eventType.value)) return undefined;
    return withHandler(source, handler);
  }

  return undefined;
}

/**
 * Pair a source with an inline handler function, if that is what was attached.
 *
 * A handler passed by reference (`ws.onmessage = handleIt`) has no parameter
 * this file can name and no body to scope, so it resolves to `undefined` and
 * the sink inside `handleIt` falls to the generic rule.
 */
function withHandler(
  source: MessageSource,
  handler: TSESTree.Node | undefined,
):
  | { source: MessageSource; eventParam: string; handler: TSESTree.Node }
  | undefined {
  if (handler === undefined) return undefined;
  if (
    handler.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    handler.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return undefined;
  }
  const first = handler.params[0];
  if (first?.type !== AST_NODE_TYPES.Identifier) return undefined;
  return { source, eventParam: first.name, handler };
}

/**
 * Handler attachment points, PER SOURCE.
 *
 * Not one shared set. `ws.onload = (e) => eval(e.data)` is not a WebSocket
 * message handler, but a shared set resolved it as one — and then `no-eval`
 * skipped the value while `no-websocket-eval` (which only knows `onmessage`)
 * never claimed it, so nobody reported it. A source only owns the attachment
 * points it actually has.
 */
const HANDLER_PROPS: Readonly<Record<MessageSource, ReadonlySet<string>>> = {
  websocket: new Set(['onmessage']),
  worker: new Set(['onmessage']),
  filereader: new Set(['onload', 'onloadend']),
  postmessage: new Set(['onmessage']),
};

/** The `addEventListener` event names each source carries a payload on. */
const HANDLER_EVENTS: Readonly<Record<MessageSource, ReadonlySet<string>>> = {
  websocket: new Set(['message']),
  worker: new Set(['message']),
  filereader: new Set(['load', 'loadend']),
  postmessage: new Set(['message']),
};

/**
 * Does this expression read the payload off `eventParam`?
 *
 * Matches `event.data`, `event.target.result` and deeper reads such as
 * `event.data.html`, so that a sink fed a *property of* the payload is still
 * attributed to the source rather than falling through to the generic rule.
 */
export function readsEventPayload(
  node: TSESTree.Node,
  eventParam: string,
): boolean {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  return (
    current.type === AST_NODE_TYPES.Identifier && current.name === eventParam
  );
}

/**
 * Build the file's payload resolver: "which source does this value come from?"
 *
 * This is the single question every sink rule in the family needs, asked from
 * both directions:
 *
 *   source rule   `payloadSource(value) === 'websocket'`  — mine, report it
 *   generic rule  `payloadSource(value) === undefined`    — nobody's, report it
 *
 * Because the two tests are complements, exactly one rule reports any given
 * value. That is the whole fix.
 */
export function createPayloadResolver(
  program: TSESTree.Program,
): (node: TSESTree.Node) => MessageSource | undefined {
  const bindings = collectSourceBindings(program);
  const scopes: Array<{
    source: MessageSource;
    eventParam: string;
    range: [number, number];
  }> = [];

  walk(program, (node) => {
    const handler = handlerSource(node, bindings);
    if (handler === undefined) return;
    scopes.push({
      source: handler.source,
      eventParam: handler.eventParam,
      range: handler.handler.range,
    });
  });

  // Narrowest first, so a nested handler shadows the outer parameter name and
  // the first match is always the innermost one.
  scopes.sort((a, b) => a.range[1] - a.range[0] - (b.range[1] - b.range[0]));

  return (node: TSESTree.Node): MessageSource | undefined =>
    scopes.find(
      (scope) =>
        node.range[0] >= scope.range[0] &&
        node.range[1] <= scope.range[1] &&
        readsEventPayload(node, scope.eventParam),
    )?.source;
}

/** Depth-first walk over every child node. */
function walk(node: TSESTree.Node, visit: (node: TSESTree.Node) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (isNode(child)) walk(child, visit);
      }
    } else if (isNode(value)) {
      walk(value, visit);
    }
  }
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}
