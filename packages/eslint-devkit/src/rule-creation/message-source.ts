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
 * Resolution is LEXICAL on both halves. Receivers resolve through the scope
 * chain, and a payload is matched to the handler parameter's *binding* rather
 * than its name — a nested function whose parameter shares the handler's
 * parameter name reads a different value entirely. Name matching produced
 * misattribution in both directions, measured each time.
 *
 * A receiver that arrives as a parameter, from another module, or from a
 * reassigned binding stays `undefined` — deliberately, per the rule above.
 */

import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

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
 * Resolve a receiver identifier to the source it was constructed from.
 *
 * Lexical, not name-keyed. A file-wide name map cannot see shadowing: with
 * `const ws = new WebSocket()` at module scope, an inner `const ws = payload`
 * was still resolved as a WebSocket — so an attacker-controlled `payload`
 * got reported as "WebSocket message data" while the generic rule, believing
 * the line was owned, said nothing. Measured before this change.
 *
 * Resolution walks the scope chain from the reference itself, so the binding
 * that is actually in scope is the one that decides.
 */
/**
 * `SHADOWED` — the name resolves to a binding that is not a known source.
 *
 * Distinct from `undefined`, which means no binding at all, i.e. a genuine
 * global. The difference matters for `window` / `self` / `parent`: those are
 * the postMessage receivers only when nothing shadows them, and
 * `function f(window) { window.addEventListener('message', …) }` is a
 * parameter, not the global.
 */
export const SHADOWED = Symbol('shadowed');

export type ReceiverResolver = (
  node: TSESTree.Identifier,
) => MessageSource | typeof SHADOWED | undefined;

/** Find the variable a name refers to, from `scope` outwards. */
function findVariable(
  scope: TSESLint.Scope.Scope | null,
  name: string,
): TSESLint.Scope.Variable | undefined {
  for (let current = scope; current !== null; current = current.upper) {
    const found = current.variables.find((variable) => variable.name === name);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Build the resolver for a file from its scope manager.
 *
 * A variable with more than one definition is not resolved: `let ws` reassigned
 * later could be anything at the point of use, and guessing is what this module
 * exists to stop.
 */
export function createReceiverResolver(
  sourceCode: TSESLint.SourceCode,
): ReceiverResolver {
  return (node) => {
    const scope = sourceCode.getScope(node);
    const variable = findVariable(scope, node.name);
    // No binding, or a built-in global (ESLint models `globalThis` and friends
    // as variables with zero definitions): either way nothing in this file
    // shadows the name, so it can still mean the real global.
    if (variable === undefined || variable.defs.length === 0) return undefined;
    // Reassignable or re-declared: it could be anything here, so refuse to say.
    if (variable.defs.length !== 1) return SHADOWED;
    // A re-assignment is not a *definition*, so `defs` alone misses
    // `let ws = new WebSocket(); ws = somethingElse;`. More than the
    // initialiser write means the value at the point of use is not knowable.
    if (
      variable.references.filter((reference) => reference.isWrite()).length > 1
    ) {
      return SHADOWED;
    }
    // `find` rather than `defs[0]`, so there is no defensive optional chain
    // that can never be undefined — the length check above already guarantees
    // one entry, and dead branches are how coverage stops meaning anything.
    const declarator = variable.defs.find(
      (
        definition,
      ): definition is typeof definition & {
        node: TSESTree.VariableDeclarator;
      } => definition.node.type === AST_NODE_TYPES.VariableDeclarator,
    );
    if (declarator === undefined) return SHADOWED;
    return constructedSource(declarator.node.init) ?? SHADOWED;
  };
}

/** The source a `new X()` expression constructs, if X is one we own a rule for. */
export function constructedSource(
  node: TSESTree.Node | null | undefined,
): MessageSource | undefined {
  // Accepts null so callers can pass a declarator's `init` directly — a
  // `?? undefined` at each call site is a branch no test can reach.
  if (node == null || node.type !== AST_NODE_TYPES.NewExpression)
    return undefined;
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return undefined;
  return CONSTRUCTORS.get(node.callee.name);
}

/**
 * The source of a receiver expression — `ws` in `ws.onmessage = …`.
 *
 * Resolves an identifier through the scope chain, and an inline
 * `new WebSocket().onmessage = …` directly. Anything else is unknown.
 */
export function receiverSource(
  receiver: TSESTree.Node,
  resolve: ReceiverResolver,
): MessageSource | undefined {
  if (receiver.type === AST_NODE_TYPES.Identifier) {
    const resolved = resolve(receiver);
    // `window` / `self` / … are the postMessage receivers only when nothing
    // shadows them — an unbound name is the global, a bound one is not.
    if (resolved === undefined) {
      return POSTMESSAGE_RECEIVERS.has(receiver.name)
        ? 'postmessage'
        : undefined;
    }
    return resolved === SHADOWED ? undefined : resolved;
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
  resolve: ReceiverResolver,
):
  | { source: MessageSource; eventParam: string; handler: TSESTree.Node }
  | undefined {
  if (node.type === AST_NODE_TYPES.AssignmentExpression) {
    if (node.left.type !== AST_NODE_TYPES.MemberExpression) return undefined;
    if (node.left.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    const source = receiverSource(node.left.object, resolve);
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
    const source = receiverSource(node.callee.object, resolve);
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
  const root = payloadRoot(node);
  return root !== undefined && root.name === eventParam;
}

/**
 * The identifier a member chain is rooted at — `event` in `event.target.result`.
 *
 * Exposed so callers can resolve that identifier to a *binding*. Matching on the
 * name alone is not enough: a nested function whose parameter shares the
 * handler's parameter name reads an entirely different value.
 */
export function payloadRoot(
  node: TSESTree.Node,
): TSESTree.Identifier | undefined {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  return current.type === AST_NODE_TYPES.Identifier ? current : undefined;
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
  sourceCode: TSESLint.SourceCode,
): (node: TSESTree.Node) => MessageSource | undefined {
  const resolve = createReceiverResolver(sourceCode);
  const program = sourceCode.ast;
  const scopes: Array<{
    source: MessageSource;
    handler: TSESTree.Node;
    range: [number, number];
  }> = [];

  walk(program, (node) => {
    const handler = handlerSource(node, resolve);
    if (handler === undefined) return;
    scopes.push({
      source: handler.source,
      handler: handler.handler,
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
        readsPayloadOf(node, scope.handler, sourceCode),
    )?.source;
}

/**
 * Does this expression read the value bound to `parameter`?
 *
 * Compares the resolved binding, not the name. `ws.onmessage = (e) => {
 * function render(e) { el.innerHTML = e.data; } }` reads a DIFFERENT `e`; on a
 * name match the payload was attributed to the WebSocket, so the source rule
 * reported an unrelated value and the generic rule skipped the line.
 */
function readsPayloadOf(
  node: TSESTree.Node,
  handler: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const root = payloadRoot(node);
  if (root === undefined) return false;
  const variable = findVariable(sourceCode.getScope(root), root.name);
  if (variable === undefined) return false;
  // The root must be a PARAMETER OF THIS HANDLER. A nested function whose
  // parameter shares the name resolves to its own binding and fails here,
  // which is the whole point of comparing definitions rather than names.
  return variable.defs.some(
    (definition) =>
      definition.type === 'Parameter' && definition.node === handler,
  );
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
