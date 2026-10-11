/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview How a tool registration is laid out, read once for every rule.
 *
 * Each rule used to read `arguments[1]` as "the config" for both
 * `registerTool(name, config, cb)` and the legacy `tool(...)`. They are not the
 * same shape. The legacy overloads are positional —
 *
 *     tool(name, cb)
 *     tool(name, description, cb)
 *     tool(name, paramsShape, cb)
 *     tool(name, annotations, cb)
 *     tool(name, description, paramsShape, cb)
 *     tool(name, description, paramsShape, annotations, cb)
 *     …
 *
 * — so `arguments[1]` is a description string, a params shape whose keys are
 * the tool's *arguments*, or an annotations object, and never a config. Reading
 * it as a config is how a `create_issue` tool with `title`/`description`
 * *parameters* came to be reported as a dynamic tool description.
 *
 * Everything here is read off the AST of the call. Nothing follows a value
 * through the program.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';

export const REGISTER_TOOL = 'registerTool';
export const LEGACY_TOOL = 'tool';

export type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression
  | TSESTree.FunctionDeclaration;

export function isFunctionNode(
  node: TSESTree.Node | null | undefined,
): node is FunctionNode {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression' ||
    node?.type === 'FunctionDeclaration'
  );
}

/** The variable a name refers to from `scope`, walking outward. */
export function lookupVariable(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable) return variable;
  }
  return undefined;
}

/**
 * The `const` initializer an identifier is bound to, or `undefined`.
 *
 * Only `const name = <init>` qualifies: a `let`/`var` may be reassigned, and a
 * destructured binding names part of a value, not the value.
 */
export function constInitializer(
  node: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
): TSESTree.Expression | undefined {
  const def = lookupVariable(node.name, scope)?.defs[0];
  if (def?.type !== 'Variable') return undefined;
  if (def.parent.kind !== 'const') return undefined;
  if (def.node.id.type !== 'Identifier') return undefined;
  return def.node.init ?? undefined;
}

/**
 * The function a handler argument denotes.
 *
 * An inline function is itself. An identifier is followed **once**, to a
 * function declaration or a `const` initialised with a function in this file —
 * the "handlers live in named functions" layout. Anything else (an import, a
 * factory call, a parameter) is not visible here and returns `undefined`.
 */
export function resolveFunction(
  node: TSESTree.Node | undefined,
  scope: TSESLint.Scope.Scope,
): FunctionNode | undefined {
  if (node === undefined) return undefined;
  if (isFunctionNode(node)) return node;
  if (node.type !== 'Identifier') return undefined;
  const def = lookupVariable(node.name, scope)?.defs[0];
  if (def?.type === 'FunctionName') return def.node as FunctionNode;
  const init = constInitializer(node, scope);
  return isFunctionNode(init) ? init : undefined;
}

/**
 * What a legacy `tool()` object argument is.
 *
 * The SDK decides at runtime with `isZodRawShapeCompat` — "are the values Zod
 * schemas?". The static mirror of that question:
 *
 *   - `shape`: every value is built by a call (`z.string()`,
 *     `z.string().optional()`), or the object is empty (the SDK treats `{}` as
 *     an empty params shape).
 *   - `annotations`: every value is a literal — `{ readOnlyHint: true,
 *     title: 'Read' }`.
 *   - `unknown`: anything else — a spread, a computed key, a schema held in a
 *     variable. Every caller abstains on it.
 */
export type LegacyObjectKind = 'shape' | 'annotations' | 'unknown';

/**
 * Resolves an identifier or member read to the expression it denotes (see
 * `module-resolver.ts`), or `undefined` when it cannot.
 */
export type ValueResolver = (node: TSESTree.Node) => TSESTree.Node | undefined;

export function classifyLegacyObject(
  node: TSESTree.ObjectExpression,
  resolve?: ValueResolver,
): LegacyObjectKind {
  if (node.properties.length === 0) return 'shape';
  let calls = 0;
  let literals = 0;
  for (const prop of node.properties) {
    if (prop.type !== 'Property' || prop.computed) return 'unknown';
    let value: TSESTree.Node = prop.value;
    // `{ path: PathSchema }` — a schema held in a const, here or in a
    // relative module, is still a schema.
    if (
      resolve &&
      (value.type === 'Identifier' || value.type === 'MemberExpression')
    )
      value = resolve(value) ?? value;
    if (value.type === 'CallExpression') calls++;
    else if (value.type === 'Literal' || value.type === 'TemplateLiteral')
      literals++;
  }
  if (calls === node.properties.length) return 'shape';
  if (literals === node.properties.length) return 'annotations';
  return 'unknown';
}

/** Does this legacy positional argument look like a description string? */
function isStringShaped(node: TSESTree.Node): boolean {
  return (
    (node.type === 'Literal' && typeof node.value === 'string') ||
    node.type === 'TemplateLiteral' ||
    node.type === 'TaggedTemplateExpression' ||
    (node.type === 'BinaryExpression' && node.operator === '+')
  );
}

/**
 * The schema state of a registration.
 *
 *   - `none`: definitely no input schema — the handler receives no client
 *     arguments.
 *   - `schema`: an input schema expression the caller may try to read.
 *   - `unknown`: cannot tell from this call (a config by reference, a spread).
 */
export type SchemaState =
  | { kind: 'none' }
  | { kind: 'schema'; node: TSESTree.Node }
  | { kind: 'unknown' };

export interface ToolRegistration {
  method: typeof REGISTER_TOOL | typeof LEGACY_TOOL;
  call: TSESTree.CallExpression;
  /** `registerTool`'s config object, when it is written inline. */
  config?: TSESTree.ObjectExpression;
  /** A legacy positional description. */
  description?: TSESTree.Node;
  /** A legacy annotations object. */
  annotations?: TSESTree.ObjectExpression;
  schema: SchemaState;
  /** The last argument — the tool callback. */
  handler?: TSESTree.Node;
}

/** Is `name` the property this member call invokes? */
export function calledMethod(node: TSESTree.CallExpression): string | null {
  if (node.callee.type !== 'MemberExpression') return null;
  return propertyName(node.callee);
}

/** The tool name for a message, or `unknown` when it is not a literal. */
export function toolNameOf(node: TSESTree.CallExpression): string {
  return staticString(node.arguments[0]) ?? 'unknown';
}

/**
 * Read a `registerTool` / legacy `tool` call into its parts, or `undefined`
 * when the call is neither.
 */
export function readRegistration(
  node: TSESTree.CallExpression,
  resolve?: ValueResolver,
): ToolRegistration | undefined {
  const method = calledMethod(node);
  const args = node.arguments;

  if (method === REGISTER_TOOL) {
    const config = args[1];
    const handler = args.length >= 3 ? args[args.length - 1] : undefined;
    if (config?.type !== 'ObjectExpression') {
      return { method, call: node, schema: { kind: 'unknown' }, handler };
    }
    return {
      method,
      call: node,
      config,
      schema: configSchema(config),
      handler,
    };
  }

  if (method !== LEGACY_TOOL || args.length < 2) return undefined;

  const handler = args[args.length - 1];
  const last = args.length - 1;
  const registration: ToolRegistration = {
    method,
    call: node,
    schema: { kind: 'none' },
    handler,
  };

  let index = 1;
  // `tool(name, X, …, cb)`: X is the description when it is string-shaped, or
  // when four or more arguments leave a slot for it before an object.
  const first = args[1]!;
  if (
    index < last &&
    first.type !== 'ObjectExpression' &&
    !isFunctionNode(first) &&
    (isStringShaped(first) || args.length >= 4)
  ) {
    registration.description = first;
    index = 2;
  }

  if (index < last) {
    const slot = args[index]!;
    if (slot.type !== 'ObjectExpression') {
      // A schema held in a variable — cannot see whether it is one.
      registration.schema = { kind: 'unknown' };
    } else {
      const kind = classifyLegacyObject(slot, resolve);
      if (kind === 'shape') {
        registration.schema = { kind: 'schema', node: slot };
        const next = args[index + 1]!;
        if (index + 1 < last && next.type === 'ObjectExpression')
          registration.annotations = next;
      } else if (kind === 'annotations') {
        registration.annotations = slot;
      } else {
        registration.schema = { kind: 'unknown' };
      }
    }
  }
  return registration;
}

/** The input-schema state of an inline `registerTool` config. */
export function configSchema(config: TSESTree.ObjectExpression): SchemaState {
  let state: SchemaState = { kind: 'none' };
  for (const prop of config.properties) {
    // A spread may carry an inputSchema — and one after an explicit key
    // replaces it at runtime.
    if (prop.type === 'SpreadElement') {
      state = { kind: 'unknown' };
      continue;
    }
    if (objectKeyName(prop) === 'inputSchema')
      state = { kind: 'schema', node: prop.value };
  }
  return state;
}

/** The statically-readable key of an object property, or `undefined`. */
export function propertyKey(
  prop: TSESTree.ObjectLiteralElement | TSESTree.RestElement,
): string | undefined {
  if (prop.type !== 'Property') return undefined;
  return objectKeyName(prop) ?? undefined;
}

/** Chained calls that keep an object schema's key set exactly as declared. */
const KEY_PRESERVING = new Set([
  'strict',
  'strip',
  'describe',
  'partial',
  'required',
  'readonly',
  'meta',
]);

/** Chained calls that let undeclared keys through to the handler. */
const LOOSENING = new Set(['passthrough', 'loose']);

/** Constructors whose single object argument is the key set. */
const OBJECT_CONSTRUCTORS = new Set(['object', 'strictObject']);
const LOOSE_CONSTRUCTORS = new Set(['looseObject']);

export interface SchemaFields {
  /** Declared key → its schema expression. */
  fields: Map<string, TSESTree.Node>;
  /** Undeclared keys reach the handler instead of being stripped. */
  loose: boolean;
}

/**
 * The keys an input schema declares, or `undefined` when they cannot be read.
 *
 * Reads the raw shape `{ path: z.string() }` and an object schema built in
 * place — `z.object({...})`, `z.strictObject({...})`, `z.looseObject({...})` —
 * through the chained calls that keep its key set (`.strict()`,
 * `.describe()`, …). `.passthrough()` / `.loose()` / `looseObject` mark the
 * schema loose: undeclared keys then arrive unvalidated rather than stripped.
 *
 * A spread, a computed key, `.extend()`, or a schema held in a variable could
 * declare anything, and returns `undefined`.
 */
export function schemaFields(node: TSESTree.Node): SchemaFields | undefined {
  let loose = false;
  let current: TSESTree.Node = node;

  while (current.type === 'CallExpression') {
    if (current.callee.type !== 'MemberExpression') return undefined;
    const method = propertyName(current.callee);
    if (method === null) return undefined;
    if (OBJECT_CONSTRUCTORS.has(method) || LOOSE_CONSTRUCTORS.has(method)) {
      if (LOOSE_CONSTRUCTORS.has(method)) loose = true;
      const shape = current.arguments[0];
      if (current.arguments.length !== 1 || shape?.type !== 'ObjectExpression')
        return undefined;
      current = shape;
      break;
    }
    if (LOOSENING.has(method)) loose = true;
    else if (!KEY_PRESERVING.has(method)) return undefined;
    current = current.callee.object;
  }

  if (current.type !== 'ObjectExpression') return undefined;
  const fields = new Map<string, TSESTree.Node>();
  for (const entry of current.properties) {
    if (entry.type === 'SpreadElement') return undefined;
    const key = propertyKey(entry);
    if (key === undefined) return undefined;
    fields.set(key, entry.value);
  }
  return { fields, loose };
}

/**
 * Is this field schema restricted to a fixed set of values?
 *
 * `z.enum([...])`, `z.literal(...)` and `z.nativeEnum(...)`, through any
 * modifiers chained on them (`.optional()`, `.default(…)`, `.describe(…)`).
 * The SDK enforces the set before the handler runs — the allowlist this
 * plugin's own fix text asks for.
 */
export function isClosedSetSchema(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node;
  let innermost: string | null = null;
  while (
    current.type === 'CallExpression' &&
    current.callee.type === 'MemberExpression'
  ) {
    innermost = propertyName(current.callee);
    current = current.callee.object;
  }
  return (
    innermost === 'enum' ||
    innermost === 'literal' ||
    innermost === 'nativeEnum'
  );
}

/**
 * Keys of the handler-context object the SDK passes as the *first* argument
 * when a tool declares no input schema — v1's `RequestHandlerExtra` and v2's
 * `ServerContext`. Reading one of these from a schema-less handler is reading
 * the context, which is correct.
 */
export const HANDLER_CONTEXT_KEYS: ReadonlySet<string> = new Set([
  'signal',
  'authInfo',
  'sessionId',
  '_meta',
  'requestId',
  'requestInfo',
  'sendNotification',
  'sendRequest',
  'taskStore',
  'taskId',
  'taskRequestedTtl',
  'closeSSEStream',
  'closeStandaloneSSEStream',
  'mcpReq',
  'http',
]);
