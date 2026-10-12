/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow sharing one stateless Streamable HTTP transport, or
 * one MCP server, across requests
 * @description CVE-2026-25536. In stateless mode (`sessionIdGenerator:
 * undefined`) a Streamable HTTP transport has no session to key responses by:
 * JSON-RPC request IDs from different clients collide, and a response meant
 * for one client is written to another. The SDK's stateless example builds a
 * fresh server and transport inside the route handler for exactly this
 * reason.
 *
 *     const server = new McpServer({ name: 'demo', version: '1.0.0' });
 *     app.post('/mcp', async (req, res) => {
 *       const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
 *       await server.connect(transport);       // one server, every request
 *       await transport.handleRequest(req, res, req.body);
 *     });
 *
 * ## What is reported
 *
 *   - `statelessTransportAtModuleLevel`: a stateless Streamable HTTP transport
 *     constructed outside every function — one instance serves every request.
 *   - `sharedServerAcrossRequests`: a stateless transport constructed inside a
 *     function and passed to `connect()` on an `McpServer` / `Server` whose
 *     construction lies outside that function.
 *
 * A transport is stateless when it is one of the SDK's Streamable HTTP server
 * transports and its options, written inline, omit `sessionIdGenerator` or set
 * it to the global `undefined`. Options held elsewhere are not read.
 *
 * ## Overlap
 *
 * None. `node-security` and `secure-coding` have no notion of an MCP
 * transport's session mode or of which server it is connected to.
 *
 * @see https://nvd.nist.gov/vuln/detail/CVE-2026-25536
 */
import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { createInstanceResolver } from '../../utils/instances';
import { fileUsesMcpSdk, isMcpModule } from '../../utils/mcp-evidence';
import { mcpExport } from '../../utils/tool-handlers';
import {
  isFunctionNode,
  lookupVariable,
  propertyKey,
} from '../../utils/tool-registration';

type MessageIds =
  'statelessTransportAtModuleLevel' | 'sharedServerAcrossRequests';

/** The SDK's Streamable HTTP server transports — the ones with a stateless mode. */
// @vocabulary MCP SDK Streamable HTTP server transport exports (v1 + v2)
const STREAMABLE_TRANSPORTS = new Set([
  'StreamableHTTPServerTransport',
  'NodeStreamableHTTPServerTransport',
  'WebStandardStreamableHTTPServerTransport',
]);

/** SDK server classes with `connect(transport)`. */
// @vocabulary MCP SDK server exports
const SERVER_CLASSES = new Set(['McpServer', 'Server']);

const ADVISORY = 'https://nvd.nist.gov/vuln/detail/CVE-2026-25536';

/** The nearest function (or class field) whose evaluation a node belongs to. */
function ownerOf(node: TSESTree.Node): TSESTree.Node | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunctionNode(current) || current.type === 'PropertyDefinition')
      return current;
  }
  return undefined;
}

/** Does `owner` contain `node`? */
function contains(owner: TSESTree.Node, node: TSESTree.Node): boolean {
  for (
    let current: TSESTree.Node | undefined = node;
    current;
    current = current.parent
  ) {
    if (current === owner) return true;
  }
  return false;
}

export const noSharedStatelessTransport = createRule<[], MessageIds>({
  name: 'no-shared-stateless-transport',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-shared-stateless-transport.md',
      description:
        'Disallow sharing one stateless Streamable HTTP transport or one MCP server across requests',
      cwe: 'CWE-488',
      cvss: 7.5,
    },
    messages: {
      statelessTransportAtModuleLevel: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Stateless MCP Transport Shared Across Requests',
        cwe: 'CWE-488',
        owasp: 'A04:2021',
        cvss: 7.5,
        description:
          "This stateless `{{transport}}` is created once at module level, so every request goes through one transport with no session to key responses by; JSON-RPC IDs from different clients collide and one client receives another's responses (CVE-2026-25536)",
        severity: 'HIGH',
        compliance: ['SOC2', 'GDPR'],
        fix: 'Create the server and the transport inside the request handler, per request, and close both when the response closes, or switch to stateful mode with `sessionIdGenerator: () => randomUUID()` and a transport per session.',
        documentationLink: ADVISORY,
      }),
      sharedServerAcrossRequests: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Server Shared Across Stateless Requests',
        cwe: 'CWE-488',
        owasp: 'A04:2021',
        cvss: 7.5,
        description:
          'A per-request stateless transport is connected to an `{{server}}` built outside this handler, so one server instance serves every request and responses can be delivered to the wrong client (CVE-2026-25536)',
        severity: 'HIGH',
        compliance: ['SOC2', 'GDPR'],
        fix: 'Build the server per request as well: call a `getServer()` factory (or `new McpServer(...)`) inside the handler, connect it to the new transport, and close both when the response closes.',
        documentationLink: ADVISORY,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;
    const builtBy = createInstanceResolver(context);
    /** Stateless transport constructions inside a function → that function. */
    const perRequest = new Map<TSESTree.Node, TSESTree.Node>();
    const connects: Array<
      TSESTree.CallExpression & { callee: TSESTree.MemberExpression }
    > = [];

    /** Inline options that omit `sessionIdGenerator` or set it to `undefined`. */
    function isStateless(node: TSESTree.NewExpression): boolean {
      const options = node.arguments[0];
      if (options === undefined) return true;
      if (options.type !== 'ObjectExpression') return false;
      let generator: TSESTree.Node | undefined;
      for (const prop of options.properties) {
        // A spread or a computed key may carry a generator.
        if (prop.type === 'SpreadElement') return false;
        const key = propertyKey(prop);
        if (key === undefined) return false;
        if (key === 'sessionIdGenerator') generator = prop.value;
      }
      if (generator === undefined) return true;
      return (
        generator.type === 'Identifier' &&
        generator.name === 'undefined' &&
        !lookupVariable('undefined', sourceCode.getScope(generator))?.defs
          .length
      );
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        const transport = mcpExport(node.callee, sourceCode.getScope(node));
        if (transport === undefined || !STREAMABLE_TRANSPORTS.has(transport))
          return;
        if (!isStateless(node)) return;
        const owner = ownerOf(node);
        if (owner === undefined) {
          context.report({
            node,
            messageId: 'statelessTransportAtModuleLevel',
            data: { transport },
          });
          return;
        }
        perRequest.set(node, owner);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression') return;
        if (propertyName(node.callee) !== 'connect') return;
        connects.push(
          node as TSESTree.CallExpression & {
            callee: TSESTree.MemberExpression;
          },
        );
      },

      'Program:exit'() {
        for (const call of connects) {
          const arg = call.arguments[0];
          if (arg === undefined) continue;
          const transport = builtBy(arg);
          const owner = transport && perRequest.get(transport.call);
          if (owner === undefined) continue;
          const server = builtBy(call.callee.object);
          if (server === undefined || !isMcpModule(server.module)) continue;
          const name = server.path[server.path.length - 1]!;
          if (!SERVER_CLASSES.has(name)) continue;
          // Built inside the same per-request function: a fresh server per request.
          if (contains(owner, server.call)) continue;
          context.report({
            node: call,
            messageId: 'sharedServerAcrossRequests',
            data: { server: name },
          });
        }
      },
    };
  },
});
