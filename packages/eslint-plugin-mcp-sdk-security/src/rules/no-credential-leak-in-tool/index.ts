/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP tool handing its credentials to the model or
 * forwarding the caller's token upstream
 * @description A tool result is read by the model, logged by the host, and
 * can be echoed into any later tool call the model is steered into making.
 * Two shapes put credentials there, and one sends a credential where it was
 * never meant to go:
 *
 *   - **the environment in a result** — `process.env` returned whole
 *     (`JSON.stringify(process.env)`, `{ ...process.env }`,
 *     `Object.entries(process.env)`), or `process.env[name]` where a tool
 *     argument picks `name`. `Object.keys(process.env)` lists names, not
 *     values, and is not reported; neither is a test file. Every API key the server was started with is then
 *     one prompt away. Reading ONE named variable (`process.env.NODE_ENV`) is
 *     not reported: whether it is secret is not something a name can prove.
 *   - **the caller's token in a result** — `extra.authInfo.token`, the bearer
 *     token the SDK verified for this request, returned to the model.
 *   - **token passthrough** — the same token forwarded in an outbound HTTP
 *     request or to an upstream MCP client transport. The MCP authorization
 *     spec forbids it: a server must not pass through the token it received,
 *     because the downstream API then trusts a token that was never issued
 *     for it (a confused deputy), and audit trails attribute the call to the
 *     wrong party.
 *
 * `authInfo` is read from the request context the SDK passes each handler —
 * the second parameter when the tool declares an input schema, the first when
 * it does not, and the second of a `setRequestHandler(CallToolRequestSchema)`
 * handler. `process.env` is the global (or `node:process`), never a local
 * named `process`.
 *
 * ## Overlap
 *
 * None. Neither the tool-result channel nor the SDK's `AuthInfo` exists
 * outside MCP; `node-security` and `secure-coding` have no rule for either.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices#token-passthrough
 */
import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { httpRequestOf } from '../../utils/http-clients';
import { createInstanceResolver } from '../../utils/instances';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { createHandlerCollector, mcpExport } from '../../utils/tool-handlers';
import {
  isFunctionNode,
  lookupVariable,
  type FunctionNode,
} from '../../utils/tool-registration';
import {
  createFlow,
  flowOptionsFor,
  returnedExpressions,
  type Taint,
} from '../../utils/value-flow';

type MessageIds = 'envInResult' | 'tokenInResult' | 'tokenPassthrough';

/** The `AuthInfo` field holding the bearer token (MCP SDK `AuthInfo.token`). */
const TOKEN_KEY = 'token';

/** MCP client transports that send requests to another server. */
const UPSTREAM_TRANSPORTS = new Set([
  'StreamableHTTPClientTransport',
  'SSEClientTransport',
]);

/** How many bindings a result may be followed through. */
const MAX_RESULT_DEPTH = 8;

const message = (
  issueName: string,
  cwe: string,
  description: string,
  fix: string,
) =>
  formatLLMMessage({
    icon: MessageIcons.SECURITY,
    issueName,
    cwe,
    owasp: 'A01:2021',
    cvss: 7.5,
    description,
    severity: 'HIGH',
    compliance: ['SOC2', 'GDPR', 'NIST-CSF'],
    fix,
    documentationLink:
      'https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices',
  });

/** Child nodes, skipping `parent` back-links. */
function children(node: TSESTree.Node): TSESTree.Node[] {
  const out: TSESTree.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (
        child !== null &&
        typeof child === 'object' &&
        typeof (child as TSESTree.Node).type === 'string'
      )
        out.push(child as TSESTree.Node);
    }
  }
  return out;
}

export const noCredentialLeakInTool = createRule<[], MessageIds>({
  name: 'no-credential-leak-in-tool',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-credential-leak-in-tool.md',
      description:
        "Disallow an MCP tool returning the server's environment or the caller's token, or forwarding that token upstream",
      cwe: 'CWE-200',
      cvss: 7.5,
    },
    messages: {
      envInResult: message(
        'MCP Tool Returns the Server Environment',
        'CWE-526',
        'This tool result carries `{{what}}`, so every credential the server was started with reaches the model and anything that can steer it',
        'Return only the specific, non-secret values the tool exists to report, each named in code. Never return `process.env` or let an argument choose which variable is read.',
      ),
      tokenInResult: message(
        "MCP Tool Returns the Caller's Token",
        'CWE-200',
        'This tool result carries `{{arg}}` — the bearer token this request was authorised with — so the model, the host log and any later tool call can read it',
        'Return what the token grants (the user id, the scopes) instead of the token itself.',
      ),
      tokenPassthrough: message(
        "MCP Tool Forwards the Caller's Token",
        'CWE-441',
        '`{{arg}}` — the bearer token this MCP server received — is forwarded through `{{client}}`. The MCP spec forbids token passthrough: the downstream API trusts a token not issued for it, and the call is attributed to the wrong party',
        'Authenticate to the downstream API with a credential issued to this server (OAuth token exchange / on-behalf-of, or the server’s own client credentials). Never forward the inbound token.',
      ),
    },
    schema: [],
  },
  defaultOptions: [],
  // A test fixture server reporting its own environment ships nothing.
  skipTestFiles: true,
  createOnce(context) {
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let builtBy: ReturnType<typeof createInstanceResolver>;
    let argumentRoots: ReturnType<typeof createHandlerCollector>;
    let contextRoots: ReturnType<typeof createHandlerCollector>;
    let outbound: { node: TSESTree.Node; client: string }[];

    /** Is this `process.env` — the global, or `node:process`'s? */
    function isProcessEnv(
      node: TSESTree.Node,
    ): node is TSESTree.MemberExpression {
      if (node.type !== 'MemberExpression' || propertyName(node) !== 'env')
        return false;
      const scope = sourceCode.getScope(node);
      if (
        node.object.type === 'Identifier' &&
        node.object.name === 'process' &&
        !lookupVariable('process', scope)?.defs.length
      )
        return true;
      const binding = resolveModuleBinding(node, scope);
      return binding?.module === 'process' && binding.path.join('.') === 'env';
    }

    /** Is `node` the argument of the global `Object.keys(...)`? */
    function isObjectKeysOf(node: TSESTree.Node): boolean {
      const call = node.parent;
      return (
        call?.type === 'CallExpression' &&
        call.arguments[0] === node &&
        call.callee.type === 'MemberExpression' &&
        call.callee.object.type === 'Identifier' &&
        call.callee.object.name === 'Object' &&
        propertyName(call.callee) === 'keys' &&
        !lookupVariable('Object', sourceCode.getScope(call))?.defs.length
      );
    }

    return {
      before() {
        if (!fileUsesMcpSdk(context.sourceCode.ast)) return false;
        sourceCode = context.sourceCode;
        const resolve = valueResolverFor(context);
        builtBy = createInstanceResolver(context);
        argumentRoots = createHandlerCollector(context, resolve, 'arguments');
        contextRoots = createHandlerCollector(context, resolve, 'context');
        outbound = [];
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        argumentRoots.visit(node);
        contextRoots.visit(node);
        const request = httpRequestOf(node, sourceCode.getScope(node), builtBy);
        if (request !== undefined)
          for (const arg of node.arguments)
            outbound.push({ node: arg, client: request.client });
      },
      NewExpression(node: TSESTree.NewExpression) {
        const name = mcpExport(node.callee, sourceCode.getScope(node));
        if (name !== undefined && UPSTREAM_TRANSPORTS.has(name))
          for (const arg of node.arguments)
            outbound.push({ node: arg, client: `new ${name}()` });
      },

      'Program:exit'() {
        const handlers = new Set<TSESTree.Node>([
          ...argumentRoots.roots.keys(),
          ...contextRoots.roots.keys(),
        ]);
        // The argument flow: which `process.env[name]` an argument picks.
        const fromArgs = createFlow(
          sourceCode,
          (fn) => argumentRoots.roots.get(fn),
          undefined,
          flowOptionsFor(context),
        );
        // The context flow: `authInfo` and the token on it.
        const fromContext = createFlow(
          sourceCode,
          (fn) => contextRoots.roots.get(fn),
          (node, follow) => {
            // `JSON.stringify(extra.authInfo)` serialises the token with it.
            if (
              node.type !== 'CallExpression' ||
              node.callee.type !== 'MemberExpression' ||
              node.callee.object.type !== 'Identifier' ||
              node.callee.object.name !== 'JSON' ||
              propertyName(node.callee) !== 'stringify' ||
              lookupVariable('JSON', sourceCode.getScope(node))?.defs.length ||
              node.arguments[0] === undefined
            )
              return undefined;
            const t = follow(node.arguments[0]);
            return t?.kind === 'object'
              ? { kind: 'value', text: t.text, key: TOKEN_KEY }
              : t;
          },
          flowOptionsFor(context),
        );

        /** The token, if `node` (or anything inside its literals) carries it. */
        const tokenIn = (node: TSESTree.Node, depth = 0): Taint | null => {
          if (depth > MAX_RESULT_DEPTH) return null;
          if (node.type === 'ObjectExpression') {
            for (const prop of node.properties) {
              const value =
                prop.type === 'Property' ? prop.value : prop.argument;
              const t = tokenIn(value, depth + 1);
              if (t) return t;
            }
            return null;
          }
          if (node.type === 'ArrayExpression') {
            for (const element of node.elements) {
              const t = element && tokenIn(element, depth + 1);
              if (t) return t;
            }
            return null;
          }
          if (node.type === 'Identifier') {
            const variable = lookupVariable(
              node.name,
              sourceCode.getScope(node),
            );
            const def = variable?.defs[0];
            if (
              def?.type === 'Variable' &&
              def.node.id === def.name &&
              (def.node.init?.type === 'ObjectExpression' ||
                def.node.init?.type === 'ArrayExpression')
            )
              return tokenIn(def.node.init, depth + 1);
          }
          const t = fromContext(node);
          return t?.kind === 'value' && t.key === TOKEN_KEY ? t : null;
        };

        /** Every `process.env` a result reaches, following local bindings. */
        const envIn = (root: TSESTree.Node): TSESTree.MemberExpression[] => {
          const found: TSESTree.MemberExpression[] = [];
          const seen = new Set<TSESLint.Scope.Variable>();
          const visit = (node: TSESTree.Node): void => {
            if (isFunctionNode(node)) return;
            if (isProcessEnv(node)) {
              const parent = node.parent;
              // `Object.keys(process.env)` lists names, not values.
              if (isObjectKeysOf(node)) return;
              // `process.env.HOME` reads one named value; `process.env[arg]`
              // lets the model pick which.
              if (parent?.type !== 'MemberExpression' || parent.object !== node)
                found.push(node);
              else if (
                parent.computed &&
                fromArgs(parent.property)?.kind === 'value'
              )
                found.push(parent);
              return;
            }
            if (node.type === 'Identifier') {
              const variable = lookupVariable(
                node.name,
                sourceCode.getScope(node),
              );
              if (variable === undefined || seen.has(variable)) return;
              seen.add(variable);
              for (const def of variable.defs)
                if (def.type === 'Variable' && def.node.init)
                  visit(def.node.init);
              return;
            }
            for (const child of children(node)) visit(child);
          };
          visit(root);
          return found;
        };

        for (const fn of handlers) {
          for (const result of returnedExpressions(fn as FunctionNode)) {
            for (const env of envIn(result))
              context.report({
                node: env,
                messageId: 'envInResult',
                data: { what: sourceCode.getText(env) },
              });
            const token = tokenIn(result);
            if (token)
              context.report({
                node: result,
                messageId: 'tokenInResult',
                data: { arg: token.text },
              });
          }
        }

        for (const { node, client } of outbound) {
          const inner = node.type === 'SpreadElement' ? node.argument : node;
          const token = tokenIn(inner);
          if (token)
            context.report({
              node,
              messageId: 'tokenPassthrough',
              data: { arg: token.text, client },
            });
        }
      },
    };
  },
});
