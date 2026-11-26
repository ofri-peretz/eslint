/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Do not authorize a gRPC caller by an identity read from metadata
 * @description gRPC metadata is HTTP/2 headers, and the client sets every one
 * of them. A backend that takes "who is calling" from a header a gateway is
 * supposed to set (`x-authenticated-user`, `x-forwarded-user`) trusts the
 * client the moment the backend is reachable another way: a debug port, an
 * SSRF, a sidecar that forwards client headers. That is CWE-290.
 *
 * Decided by flow, never by the header's name. A value is reported when:
 *
 * - it comes from `.get(…)` on a gRPC handler's call metadata: the `metadata`
 *   of the first parameter of a method in the object registered with
 *   `.addService(…)`, followed through consts, destructuring and same-file
 *   helpers whose call sites pass it;
 * - it travels unchanged in substance (consts, `String()`, templates, string
 *   methods, `??`, ternaries, `await`, the return of same-file functions, and
 *   their parameters at the call sites that pass it) — a lookup keyed by it (`TOKENS[h]`) or a call that takes it
 *   (`verify(h)`) resolves it into something else and ends the flow;
 * - and it lands on one side of an equality check, inside an `if` or ternary
 *   test, whose other side is a field of a per-request record (`acc.owner`).
 *   A comparison with `process.env.X` or a module-level constant is a
 *   credential check, not an identity, and stays silent.
 *
 * @see https://grpc.io/docs/guides/auth/
 */

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  isGlobalReference,
  MessageIcons,
  propertyName,
  variableOf,
} from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';

type MessageIds = 'identityFromMetadata';
type SourceCode = Readonly<TSESLint.SourceCode>;
type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/** How many links one question may follow before the rule gives up. */
const MAX_HOPS = 12;

const EQUALITY = new Set(['===', '!==', '==', '!=']);

function isFunction(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/** The single, never-reassigned definition of an identifier, if it has one. */
function definitionOf(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): TSESLint.Scope.Definition | undefined {
  const variable = variableOf(id, sourceCode);
  if (variable === undefined || variable.defs.length !== 1) return undefined;
  const writes = variable.references.filter(
    (ref) => ref.isWrite() && !ref.init,
  );
  return writes.length === 0 ? variable.defs[0] : undefined;
}

/** The function an identifier is bound to: `function f` or `const f = () => …`. */
function functionOf(
  id: TSESTree.Identifier,
  sourceCode: SourceCode,
): FunctionNode | undefined {
  const def = definitionOf(id, sourceCode);
  if (def?.type === 'FunctionName') return def.node as FunctionNode;
  if (def?.type !== 'Variable') return undefined;
  const init = (def.node as TSESTree.VariableDeclarator).init;
  return init !== null && isFunction(init) ? init : undefined;
}

/** References to the variable `binding` declares (no optional chains). */
function referencesOf(
  binding: TSESTree.Node,
  declaration: TSESTree.Node,
  sourceCode: SourceCode,
): TSESLint.Scope.Reference[] {
  const refs: TSESLint.Scope.Reference[] = [];
  for (const variable of sourceCode.getDeclaredVariables(declaration)) {
    if (variable.identifiers.some((id) => id === binding))
      refs.push(...variable.references);
  }
  return refs;
}

/**
 * Call sites of `fn` in this file: `f(…)` for a named function or a const, and
 * the call itself for an IIFE.
 */
function callSitesOf(
  fn: FunctionNode,
  sourceCode: SourceCode,
): TSESTree.CallExpression[] {
  const { parent } = fn;
  if (parent.type === 'CallExpression' && parent.callee === fn) return [parent];
  const [binding, declaration] =
    fn.type === 'FunctionDeclaration'
      ? [fn.id, fn]
      : parent.type === 'VariableDeclarator'
        ? [parent.id, parent]
        : [null, fn];
  if (binding === null) return [];
  return referencesOf(binding, declaration, sourceCode).flatMap(
    ({ identifier }) => {
      const call = identifier.parent;
      return call?.type === 'CallExpression' && call.callee === identifier
        ? [call]
        : [];
    },
  );
}

/** Every `return <expr>` of a function, not counting nested functions. */
function returnsOf(fn: FunctionNode): TSESTree.Expression[] {
  if (fn.body.type !== 'BlockStatement') return [fn.body];
  const found: TSESTree.Expression[] = [];
  const visit = (node: TSESTree.Node): void => {
    if (node.type === 'ReturnStatement') {
      if (node.argument) found.push(node.argument);
      return;
    }
    if (isFunction(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === 'object' && 'type' in child) {
          visit(child as TSESTree.Node);
        }
      }
    }
  };
  visit(fn.body);
  return found;
}

/** Is this object literal the implementation handed to `.addService(svc, impl)`? */
function isServiceImplementation(
  object: TSESTree.ObjectExpression,
  sourceCode: SourceCode,
): boolean {
  const registers = (call: TSESTree.Node | undefined, arg: TSESTree.Node) =>
    call?.type === 'CallExpression' &&
    call.callee.type === 'MemberExpression' &&
    propertyName(call.callee) === 'addService' &&
    call.arguments[1] === arg;
  if (registers(object.parent, object)) return true;
  const declarator = object.parent;
  if (
    declarator.type !== 'VariableDeclarator' ||
    declarator.init !== object ||
    declarator.id.type !== 'Identifier'
  ) {
    return false;
  }
  return referencesOf(declarator.id, declarator, sourceCode).some(
    ({ identifier }) => registers(identifier.parent, identifier),
  );
}

/** Is `fn` a method of a gRPC service implementation? */
function isHandler(fn: FunctionNode, sourceCode: SourceCode): boolean {
  const property = fn.parent;
  return (
    property.type === 'Property' &&
    property.value === fn &&
    property.parent.type === 'ObjectExpression' &&
    isServiceImplementation(property.parent, sourceCode)
  );
}

/**
 * Does this expression hold a handler's call metadata?
 *
 * `call.metadata` on a handler's first parameter, `{ metadata }` destructured
 * from it, a const holding either, or a helper's parameter at a position
 * where some call site passes one.
 */
function isCallMetadata(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number,
): boolean {
  if (hops <= 0) return false;
  if (node.type === 'MemberExpression') {
    if (propertyName(node) !== 'metadata') return false;
    if (node.object.type !== 'Identifier') return false;
    const def = definitionOf(node.object, sourceCode);
    return (
      def?.type === 'Parameter' &&
      isFunction(def.node as TSESTree.Node) &&
      (def.node as FunctionNode).params[0] === def.name &&
      isHandler(def.node as FunctionNode, sourceCode)
    );
  }
  if (node.type !== 'Identifier') return false;
  const def = definitionOf(node, sourceCode);
  if (def?.type === 'Variable') {
    const init = (def.node as TSESTree.VariableDeclarator).init;
    return init !== null && isCallMetadata(init, sourceCode, hops - 1);
  }
  if (def?.type !== 'Parameter') return false;
  const fn = def.node as FunctionNode;
  const [first] = fn.params;
  // `Get({ metadata }, cb)`: the `metadata` key of a handler's first parameter.
  if (first?.type === 'ObjectPattern' && def.name.parent?.type === 'Property') {
    const property = def.name.parent;
    return (
      property.parent === first &&
      property.value === def.name &&
      propertyName({
        type: 'MemberExpression',
        computed: property.computed,
        property: property.key,
      } as TSESTree.MemberExpression) === 'metadata' &&
      isHandler(fn, sourceCode)
    );
  }
  const index = fn.params.indexOf(def.name as TSESTree.Parameter);
  return callSitesOf(fn, sourceCode).some((call) => {
    const arg = call.arguments[index];
    return arg !== undefined && isCallMetadata(arg, sourceCode, hops - 1);
  });
}

/**
 * The metadata reads (`md.get(…)` calls) an expression's value is made of,
 * followed backwards through the shapes that keep a value what it was.
 */
function metadataOrigins(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  hops: number,
  seen: Set<TSESTree.Node>,
): TSESTree.CallExpression[] {
  if (hops <= 0 || seen.has(node)) return [];
  seen.add(node);
  const next = (child: TSESTree.Node) =>
    metadataOrigins(child, sourceCode, hops - 1, seen);

  switch (node.type) {
    case 'Identifier': {
      const def = definitionOf(node, sourceCode);
      if (def?.type === 'Parameter') {
        // `function norm(u) { return u.trim(); }`: what the call sites pass.
        const fn = def.node as FunctionNode;
        const index = fn.params.indexOf(def.name as TSESTree.Parameter);
        return callSitesOf(fn, sourceCode).flatMap((call) =>
          call.arguments[index] ? next(call.arguments[index]) : [],
        );
      }
      if (def?.type !== 'Variable') return [];
      // `const h = …` and `const [h] = …` both hold (a part of) the value.
      const { init } = def.node as TSESTree.VariableDeclarator;
      return init ? next(init) : [];
    }
    case 'MemberExpression':
      // `h[0]`, `h.trim` — a part of the value is still the value. The key of
      // a lookup (`TOKENS[h]`) is not followed: the result is the table's.
      return next(node.object);
    case 'ChainExpression':
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return next(node.expression);
    case 'AwaitExpression':
      return next(node.argument);
    case 'TemplateLiteral':
      return node.expressions.flatMap(next);
    case 'LogicalExpression':
      return [...next(node.left), ...next(node.right)];
    case 'ConditionalExpression':
      return [...next(node.consequent), ...next(node.alternate)];
    case 'CallExpression': {
      const { callee } = node;
      if (callee.type === 'MemberExpression') {
        if (
          propertyName(callee) === 'get' &&
          isCallMetadata(callee.object, sourceCode, MAX_HOPS)
        ) {
          return [node];
        }
        // `h.trim()`, `h.toLowerCase()`: a method of the value returns the value.
        return next(callee.object);
      }
      if (isFunction(callee)) return returnsOf(callee).flatMap(next);
      if (callee.type !== 'Identifier') return [];
      // `String(h)` keeps the value; any other global call resolves it.
      if (callee.name === 'String' && isGlobalReference(callee, sourceCode)) {
        return node.arguments.flatMap(next);
      }
      const fn = functionOf(callee, sourceCode);
      return fn ? returnsOf(fn).flatMap(next) : [];
    }
    default:
      return [];
  }
}

/** The root identifier of `a.b.c`, or undefined for `this.x`, `f().x`, … */
function rootOf(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (current.type === 'MemberExpression') current = current.object;
  return current;
}

/**
 * Is this the field of a record the handler looked up for this request
 * (`acc.owner`), as opposed to a secret or a config value?
 */
function isRecordField(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  if (node.type !== 'MemberExpression') return false;
  const root = rootOf(node);
  if (root.type !== 'Identifier') return root.type === 'CallExpression';
  const variable = variableOf(root, sourceCode);
  // `process.env.X`, and any other global, is configuration.
  if (variable === undefined || variable.defs.length === 0) {
    return root.name !== 'process';
  }
  const def = variable.defs[0];
  // A module-level constant (`CONFIG.key`) is configuration too.
  const moduleLevel =
    variable.scope.type === 'module' || variable.scope.type === 'global';
  return !(moduleLevel && def.type === 'Variable');
}

/** Is `node` inside the test of an `if` or a ternary? */
function decidesABranch(node: TSESTree.Node): boolean {
  let child: TSESTree.Node = node;
  let parent = node.parent;
  // Climb the expression the comparison sits in, up to its statement.
  while (
    parent != null &&
    !isFunction(parent) &&
    !parent.type.endsWith('Statement')
  ) {
    if (parent.type === 'ConditionalExpression' && parent.test === child) {
      return true;
    }
    child = parent;
    parent = parent.parent;
  }
  return parent?.type === 'IfStatement' && parent.test === child;
}

export const noIdentityFromMetadata = createRule<[], MessageIds>({
  name: 'no-identity-from-metadata',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-grpc-security/docs/rules/no-identity-from-metadata.md',
      description:
        'Do not authorize a gRPC caller by an identity read from metadata',
      cwe: 'CWE-290',
      cvss: 8.1,
    },
    messages: {
      identityFromMetadata: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'gRPC Caller Identity Taken From Client-Set Metadata',
        cwe: 'CWE-290',
        owasp: 'A07:2021',
        cvss: 8.1,
        description:
          'A value read from call metadata reaches an authorization check as the caller’s identity, and any client can set any metadata header',
        severity: 'HIGH',
        compliance: ['SOC2', 'ISO27001'],
        fix: 'Authenticate every call in the backend: resolve the caller from a credential you verify (a signed token, an mTLS peer certificate), never from a header a gateway is supposed to set. If a gateway hop must carry identity, authenticate the hop (mTLS) or sign the header.',
        documentationLink: 'https://grpc.io/docs/guides/auth/',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    let reported = new Set<TSESTree.Node>();
    return {
      before() {
        reported = new Set();
        return true;
      },
      BinaryExpression(node): void {
        if (!EQUALITY.has(node.operator)) return;
        if (!decidesABranch(node)) return;
        const { sourceCode } = context;
        const sides: Array<[TSESTree.Node, TSESTree.Node]> = [
          [node.left, node.right],
          [node.right, node.left],
        ];
        for (const [identity, other] of sides) {
          if (!isRecordField(other, sourceCode)) continue;
          for (const read of metadataOrigins(
            identity,
            sourceCode,
            MAX_HOPS,
            new Set(),
          )) {
            if (reported.has(read)) continue;
            reported.add(read);
            context.report({ node: read, messageId: 'identityFromMetadata' });
          }
        }
      },
    };
  },
});
