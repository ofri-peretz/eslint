/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow a predictable or constant MCP session-ID generator
 * @description In stateful Streamable HTTP mode the session ID is the only
 * thing that ties a request to a session — the SDK routes a request to the
 * transport whose ID it carries in `Mcp-Session-Id`. A counter, a timestamp or
 * `Math.random()` can be guessed from one observed ID; a constant puts every
 * client in one session.
 *
 *     new StreamableHTTPServerTransport({ sessionIdGenerator: () => String(n++) });
 *     new StreamableHTTPServerTransport({ sessionIdGenerator: () => Date.now().toString(36) });
 *     new StreamableHTTPServerTransport({ sessionIdGenerator: () => 'session' });
 *
 * ## What is reported
 *
 * The `sessionIdGenerator` of an SDK Streamable HTTP transport, read from its
 * inline options, when it is a function (inline, or a same-file function) and
 * every value it returns (or that a same-file helper it calls returns) is
 * built only from timestamps (`Date.now()`,
 * `new Date()`, `performance.now()`, `process.hrtime()`), `Math.random()`, a
 * counter (`n++`), literals, a module-level const (evaluated once), and
 * string/number derivations of those — with no CSPRNG source anywhere in it.
 * `sessionIdGenerator: Date.now` passed by reference is reported too.
 *
 * A CSPRNG source is `randomUUID` / `randomBytes` / `getRandomValues` from
 * `crypto`, the global `crypto.randomUUID()` / `crypto.getRandomValues()`,
 * `v4` / `v7` from `uuid`, and `nanoid` from `nanoid`. Any other call — an
 * imported generator, a method it cannot see into — is unknown, and the rule
 * abstains.
 *
 * ## Overlap
 *
 * `node-security/no-math-random-crypto` reports `Math.random()` where a
 * nearby identifier names a security value. This rule decides from the SDK
 * option instead, and also reports counters, timestamps and constants, which
 * no generic rule can tie to a session ID. Both may report a `Math.random()`
 * generator.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#session-hijacking
 */
import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  memberPath,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { mcpExport } from '../../utils/tool-handlers';
import {
  constInitializer,
  isFunctionNode,
  lookupVariable,
  propertyKey,
  resolveFunction,
} from '../../utils/tool-registration';
import { returnedExpressions } from '../../utils/value-flow';

type MessageIds = 'predictableSessionId' | 'constantSessionId';

/** The SDK's Streamable HTTP server transports — the ones with a sessionIdGenerator. */
// @vocabulary MCP SDK Streamable HTTP server transport exports (v1 + v2)
const STREAMABLE_TRANSPORTS = new Set([
  'StreamableHTTPServerTransport',
  'NodeStreamableHTTPServerTransport',
  'WebStandardStreamableHTTPServerTransport',
]);

/** Module exports that return cryptographically random values. */
// @vocabulary Node crypto, uuid and nanoid CSPRNG exports
const CSPRNG_EXPORTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['crypto', new Set(['randomUUID', 'randomBytes', 'getRandomValues'])],
  ['uuid', new Set(['v4', 'v7'])],
  ['nanoid', new Set(['nanoid'])],
]);

/** The Web Crypto global's random sources. */
// @vocabulary Web Crypto API
const GLOBAL_CSPRNG = new Set(['crypto.randomUUID', 'crypto.getRandomValues']);

/** Globals whose value an observer can predict. */
// @vocabulary ECMAScript / Web / Node time and PRNG globals
const PREDICTABLE_GLOBALS = new Set([
  'Date.now',
  'performance.now',
  'Math.random',
  'process.hrtime',
  'process.hrtime.bigint',
]);

/** Global functions that derive a value from their arguments without adding entropy. */
// @vocabulary ECMAScript global functions
const DERIVING_GLOBALS = new Set([
  'String',
  'Math.floor',
  'Math.round',
  'Math.trunc',
]);

/** Methods that derive a value from their receiver without adding entropy. */
// @vocabulary ECMAScript String / Number / Date / Array methods
const DERIVING_METHODS = new Set([
  'toString',
  'toFixed',
  'toISOString',
  'getTime',
  'valueOf',
  'slice',
  'substring',
  'substr',
  'padStart',
  'padEnd',
  'replace',
  'replaceAll',
  'toUpperCase',
  'toLowerCase',
  'trim',
  'join',
]);

/** How many const hops one classification may take. */
const MAX_DEPTH = 8;

/**
 * What a returned value is made of:
 *   - `csprng`: contains a cryptographically random source;
 *   - `predictable`: varies per call, but only through guessable sources;
 *   - `constant`: the same value on every call;
 *   - `unknown`: built from something the rule cannot see into.
 */
type Kind = 'csprng' | 'predictable' | 'constant' | 'unknown';

function combine(kinds: readonly Kind[]): Kind {
  if (kinds.includes('csprng')) return 'csprng';
  if (kinds.includes('unknown')) return 'unknown';
  if (kinds.includes('predictable')) return 'predictable';
  return 'constant';
}

/** Something unknown that may still carry a CSPRNG value through. */
function opaque(kinds: readonly Kind[]): Kind {
  return kinds.includes('csprng') ? 'csprng' : 'unknown';
}

/** Is `node` inside any function? */
function insideFunction(node: TSESTree.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunctionNode(current)) return true;
  }
  return false;
}

/** The dotted path of an unshadowed global (`Date.now`), or null. */
function globalPath(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): string | null {
  const path = memberPath(node);
  if (path === null || lookupVariable(path[0]!, scope)?.defs.length)
    return null;
  return path.join('.');
}

const SESSION_DOCS =
  'https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#session-hijacking';

export const noPredictableSessionId = createRule<[], MessageIds>({
  name: 'no-predictable-session-id',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-predictable-session-id.md',
      description:
        'Disallow an MCP sessionIdGenerator that returns a counter, a timestamp, Math.random() or a constant',
      cwe: 'CWE-330',
      cvss: 7.5,
    },
    messages: {
      predictableSessionId: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Predictable MCP Session ID',
        cwe: 'CWE-330',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'This sessionIdGenerator builds the session ID only from timestamps, counters or Math.random(), so a client that sees one ID can guess the IDs of other sessions and send requests into them',
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: "Return `randomUUID()` from 'node:crypto' (or the global `crypto.randomUUID()`): `sessionIdGenerator: () => randomUUID()`.",
        documentationLink: SESSION_DOCS,
      }),
      constantSessionId: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Constant MCP Session ID',
        cwe: 'CWE-330',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          "This sessionIdGenerator returns the same value for every session, so every client shares one session and can read and drive the others' requests",
        severity: 'HIGH',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Generate the ID per call: `sessionIdGenerator: () => randomUUID()`. A value computed once at module level is the same for every session.',
        documentationLink: SESSION_DOCS,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;

    function classify(node: TSESTree.Node, depth: number): Kind {
      if (depth > MAX_DEPTH) return 'unknown';
      const scope = sourceCode.getScope(node);
      switch (node.type) {
        case 'Literal':
          return 'constant';
        case 'UpdateExpression':
          return 'predictable';
        case 'TemplateLiteral':
          return combine(node.expressions.map((e) => classify(e, depth + 1)));
        case 'BinaryExpression':
          return combine([
            classify(node.left, depth + 1),
            classify(node.right, depth + 1),
          ]);
        case 'NewExpression':
          return globalPath(node.callee, scope) === 'Date'
            ? 'predictable'
            : 'unknown';
        case 'MemberExpression':
          return opaque([classify(node.object, depth + 1)]);
        case 'CallExpression':
          return classifyCall(node, scope, depth);
        case 'Identifier': {
          const init = constInitializer(node, scope);
          if (init === undefined) return 'unknown';
          // A module-level const is evaluated once: the same for every session.
          if (!insideFunction(init)) return 'constant';
          return classify(init, depth + 1);
        }
        default:
          return 'unknown';
      }
    }

    function classifyCall(
      node: TSESTree.CallExpression,
      scope: TSESLint.Scope.Scope,
      depth: number,
    ): Kind {
      const args = node.arguments.map((arg) => classify(arg, depth + 1));
      const binding = resolveModuleBinding(node.callee, scope);
      if (binding !== undefined) {
        const exported = binding.path.join('.');
        return CSPRNG_EXPORTS.get(binding.module)?.has(exported)
          ? 'csprng'
          : opaque(args);
      }
      const global = globalPath(node.callee, scope);
      if (global !== null) {
        if (GLOBAL_CSPRNG.has(global)) return 'csprng';
        if (PREDICTABLE_GLOBALS.has(global)) return 'predictable';
        if (DERIVING_GLOBALS.has(global)) return combine(args);
        return opaque(args);
      }
      if (node.callee.type === 'MemberExpression') {
        const receiver = classify(node.callee.object, depth + 1);
        const method = propertyName(node.callee);
        if (method !== null && DERIVING_METHODS.has(method))
          return combine([receiver, ...args]);
        return opaque([receiver, ...args]);
      }
      // A same-file helper: what it returns.
      const helper = resolveFunction(node.callee, scope);
      if (helper === undefined) return opaque(args);
      return combine(
        returnedExpressions(helper).map((e) => classify(e, depth + 1)),
      );
    }

    function check(value: TSESTree.Node): void {
      const scope = sourceCode.getScope(value);
      // `sessionIdGenerator: Date.now` — a predictable function by reference.
      if (value.type === 'MemberExpression') {
        const global = globalPath(value, scope);
        if (global !== null && PREDICTABLE_GLOBALS.has(global))
          context.report({ node: value, messageId: 'predictableSessionId' });
        return;
      }
      const fn = resolveFunction(value, scope);
      if (fn === undefined) return;
      const returned = returnedExpressions(fn);
      if (returned.length === 0) return;
      const kind = combine(
        returned.map((expression) => classify(expression, 0)),
      );
      if (kind === 'predictable')
        context.report({ node: value, messageId: 'predictableSessionId' });
      else if (kind === 'constant')
        context.report({ node: value, messageId: 'constantSessionId' });
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        const transport = mcpExport(node.callee, sourceCode.getScope(node));
        if (transport === undefined || !STREAMABLE_TRANSPORTS.has(transport))
          return;
        const options = node.arguments[0];
        if (options?.type !== 'ObjectExpression') return;
        let generator: TSESTree.Node | undefined;
        for (const prop of options.properties) {
          // A spread or a computed key may carry the generator.
          if (prop.type === 'SpreadElement') return;
          const key = propertyKey(prop);
          if (key === undefined) return;
          if (key === 'sessionIdGenerator') generator = prop.value;
        }
        if (generator !== undefined) check(generator);
      },
    };
  },
});
