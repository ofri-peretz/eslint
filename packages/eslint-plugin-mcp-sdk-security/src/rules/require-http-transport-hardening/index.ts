/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require an MCP HTTP server transport to validate the Host
 * header, and a network-reachable MCP server to authenticate its callers
 * @description The SDK's HTTP transports leave DNS-rebinding protection off
 * unless asked (`enableDnsRebindingProtection` defaults to `false`). A server
 * on `localhost` is then reachable from any web page the user opens: the page
 * rebinds its own hostname to 127.0.0.1 and talks to the server as a
 * same-origin peer, calling every tool it exposes.
 *
 *     new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
 *     createMcpExpressApp({ host: '0.0.0.0' });
 *     app.listen(3000, '0.0.0.0');            // and no auth anywhere in the file
 *
 * ## SDK v1 and SDK v2 put the protection in different places
 *
 * In v1 (`@modelcontextprotocol/sdk`, and `@modelcontextprotocol/server-legacy`'s
 * SSE transport) the TRANSPORT carries `enableDnsRebindingProtection` /
 * `allowedHosts`. In v2 (`@modelcontextprotocol/server`, `/node`, …) the
 * transports have no such option: the APP validates Host —
 * `createMcpExpressApp` / `createMcpHonoApp` / `createMcpFastifyApp` default to
 * 127.0.0.1 with `localhostHostValidation()`, and `allowedHosts` installs
 * `hostHeaderValidation()`. So a v2 transport is never reported; the app that
 * serves it is.
 *
 * ## What is reported
 *
 *   - `missingRebindingProtection`: an SDK v1 HTTP server transport whose options
 *     (read inline, or through a const) do not set
 *     `enableDnsRebindingProtection: true` together with a non-empty
 *     `allowedHosts` — unless the file validates Host at the app level
 *     (`hostHeaderValidation`, `localhostHostValidation`, or a
 *     `createMcpExpressApp` that installs one of them).
 *   - `appWithoutHostValidation`: an Express / Hono / Fastify app built in
 *     this file (`express()`, `new Hono()`, `fastify()`) that registers routes
 *     in a file serving an SDK v2 transport or `createMcpHandler`, when nothing
 *     in the file validates Host. An app the file does not build — a parameter
 *     typed `Express` — is not judged.
 *   - `allInterfacesWithoutAllowedHosts`: `createMcpExpressApp` /
 *     `createMcpHonoApp` / `createMcpFastifyApp` on `0.0.0.0` or `::` with no
 *     `allowedHosts` — the SDK only logs a warning.
 *   - `missingAuth`: a file that builds an MCP HTTP transport, binds to every
 *     interface explicitly, and shows no authentication — no SDK auth export,
 *     no custom middleware passed to `.use()`, and no middleware in front of
 *     the route that calls `.handleRequest()`. Auth that lives in another
 *     module is invisible here; mount it in this file.
 *
 * Test files (`*.test.ts`, `test/`, `e2e/`, `fixtures/`, …) are skipped: a
 * test server bound for one assertion is not a deployment.
 *
 * ## Overlap
 *
 * None. `node-security` and `secure-coding` have no notion of an MCP
 * transport's options or of the SDK's host-validation helpers.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#security-warning
 */
import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';
import { createInstanceResolver } from '../../utils/instances';
import { fileUsesMcpSdk, isMcpModule } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { mcpExport } from '../../utils/tool-handlers';
import { exits } from '../../utils/guards';
import {
  constInitializer,
  isFunctionNode,
  lookupVariable,
  propertyKey,
  resolveFunction,
  type FunctionNode,
} from '../../utils/tool-registration';

type MessageIds =
  | 'missingRebindingProtection'
  | 'appWithoutHostValidation'
  | 'allInterfacesWithoutAllowedHosts'
  | 'missingAuth';

/**
 * SDK HTTP server transports → the constructor argument that holds their
 * options. v1: `StreamableHTTPServerTransport(options)`,
 * `SSEServerTransport(endpoint, res, options?)`; v2:
 * `NodeStreamableHTTPServerTransport(options)` (`@modelcontextprotocol/node`),
 * `WebStandardStreamableHTTPServerTransport(options)` (`@modelcontextprotocol/server`).
 */
// @vocabulary MCP SDK HTTP server transport exports
const HTTP_TRANSPORTS: ReadonlyMap<string, number> = new Map([
  ['StreamableHTTPServerTransport', 0],
  ['SSEServerTransport', 2],
  ['NodeStreamableHTTPServerTransport', 0],
  ['WebStandardStreamableHTTPServerTransport', 0],
]);

/**
 * Packages whose transports carry their own rebinding option (SDK v1, and v2's
 * legacy SSE). Every other MCP package is v2: protection lives in the app.
 */
const TRANSPORT_OPTION_PACKAGES = [
  '@modelcontextprotocol/sdk',
  '@modelcontextprotocol/server-legacy',
];

/** SDK app factories that validate Host unless bound to every interface. */
// @vocabulary MCP SDK v1 server/express and v2 express / hono / fastify exports
const MCP_APP_FACTORIES = new Set([
  'createMcpExpressApp',
  'createMcpHonoApp',
  'createMcpFastifyApp',
]);

/** HTTP frameworks whose app a file may build by hand: module → export path. */
const RAW_APPS: Readonly<Record<string, string>> = {
  express: '',
  hono: 'Hono',
  fastify: '',
};

/** App methods that register a route (as opposed to `use`, `listen`, `set`). */
// @vocabulary Express / Hono / Fastify routing methods
const ROUTE_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'all',
  'route',
  'on',
]);

/** SDK middlewares that validate the Host header for the whole app. */
// @vocabulary MCP SDK server/middleware/hostHeaderValidation exports
const HOST_VALIDATORS = new Set([
  'hostHeaderValidation',
  'localhostHostValidation',
]);

/** SDK auth exports — their presence means the file authenticates. */
// @vocabulary MCP SDK server/auth exports
const AUTH_EXPORTS = new Set([
  'requireBearerAuth',
  'mcpAuthRouter',
  'mcpAuthMetadataRouter',
]);

/** Hosts `createMcpExpressApp` guards with `localhostHostValidation`. */
// @vocabulary MCP SDK createMcpExpressApp localhost hosts
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/** Constructions whose `.listen(port)` with no host binds every interface. */
// @vocabulary Express app / Node http(s) server
const DEFAULT_ALL_INTERFACES: Readonly<Record<string, string>> = {
  express: '',
  http: 'createServer',
  https: 'createServer',
};

/** What Node binds when `listen()` is given no host. */
const DEFAULT_LISTEN_HOST = '::';

/** Request members a header is read through: `req.headers`, `req.get()`, `c.req.header()`. */
// @vocabulary Node IncomingMessage / Express Request / Hono HonoRequest header API
const REQUEST_HEADER_READS = new Set(['headers', 'header', 'get']);

/** Hosts that bind every interface. */
// @vocabulary IPv4 / IPv6 unspecified addresses
const ALL_INTERFACE_HOSTS = new Set(['0.0.0.0', '::']);

/** Three-valued answer for an option the rule may not be able to read. */
type Tri = 'yes' | 'no' | 'unknown';

/** What a `createMcpExpressApp(...)` call does about the Host header. */
type ExpressAppState =
  /** Installs host validation — or its options cannot be read (abstain). */
  | { kind: 'guarded' }
  /** Binds every interface with no allowedHosts: no validation at all. */
  | { kind: 'allInterfaces'; host: string }
  /** A specific non-loopback host: no validation, but not all interfaces. */
  | { kind: 'other' };

const TRANSPORT_SECURITY_DOCS =
  'https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#security-warning';

export const requireHttpTransportHardening = createRule<[], MessageIds>({
  name: 'require-http-transport-hardening',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/require-http-transport-hardening.md',
      description:
        'Require an MCP HTTP server transport to validate the Host header and a network-reachable MCP server to authenticate its callers',
      cwe: 'CWE-346',
      cvss: 8.1,
    },
    messages: {
      missingRebindingProtection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP HTTP Transport Without DNS-Rebinding Protection',
        cwe: 'CWE-346',
        owasp: 'A05:2021',
        cvss: 8.1,
        description:
          '`{{transport}}` is built without `enableDnsRebindingProtection: true` and a non-empty `allowedHosts`, and nothing in this file validates the Host header, so a web page the user opens can rebind its hostname to this server and call its tools',
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: "Pass `enableDnsRebindingProtection: true, allowedHosts: ['127.0.0.1:3000', 'localhost:3000']` (the exact Host header values clients send; the transport compares them with the port), or serve the transport from `createMcpExpressApp()` or behind `hostHeaderValidation([...])`.",
        documentationLink: TRANSPORT_SECURITY_DOCS,
      }),
      appWithoutHostValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP App Without Host Validation',
        cwe: 'CWE-346',
        owasp: 'A05:2021',
        cvss: 8.1,
        description:
          'This {{framework}} app serves an SDK v2 MCP transport and nothing in this file validates the Host header — v2 transports leave DNS-rebinding protection to the app — so a web page the user opens can rebind its hostname to this server and call its tools',
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: "Build the app with `createMcpExpressApp()` / `createMcpHonoApp()` (localhost validation by default, `allowedHosts` for other hosts), or mount `hostHeaderValidation(['mcp.example.com'])` / `localhostHostValidation()` before the MCP route.",
        documentationLink: TRANSPORT_SECURITY_DOCS,
      }),
      allInterfacesWithoutAllowedHosts: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Express App on All Interfaces Without allowedHosts',
        cwe: 'CWE-346',
        owasp: 'A05:2021',
        cvss: 8.1,
        description:
          "`{{factory}}({ host: '{{host}}' })` binds every interface and, with no `allowedHosts`, installs no Host validation; the SDK only logs a warning",
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: "Pass `allowedHosts: ['mcp.example.com']` with the host names clients use, or bind to `127.0.0.1` when the server is local-only.",
        documentationLink: TRANSPORT_SECURITY_DOCS,
      }),
      missingAuth: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Network-Reachable MCP Server Without Authentication',
        cwe: 'CWE-306',
        owasp: 'A05:2021',
        cvss: 8.1,
        description:
          "This MCP HTTP server binds every interface ('{{host}}') and nothing in this file authenticates its callers (no SDK auth middleware, no custom `.use()` middleware, no middleware in front of the route that calls `handleRequest`), so anyone who can reach the port can call every tool",
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: "Mount `requireBearerAuth({ verifier })` or your own auth middleware on the MCP route in this file (`app.post('/mcp', requireBearerAuth({ verifier }), handler)`), or bind to `127.0.0.1`.",
        documentationLink:
          'https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  // A server bound for one assertion is not a deployment (the SDK's own
  // test/ and e2e/ suites were 33 of the 2026-10-11 real-code findings).
  skipTestFiles: true,
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;
    const resolve = valueResolverFor(context);
    const builtBy = createInstanceResolver(context);

    /**
     * The app variables a bind serves: the `listen` receiver (and the app a
     * `http.createServer(app)` wraps), or the variable a factory's app is
     * stored in.
     */
    function appVariables(bind: TSESTree.Node): TSESLint.Scope.Variable[] {
      const found: TSESLint.Scope.Variable[] = [];
      const add = (node: TSESTree.Node | null | undefined): void => {
        if (node?.type === 'CallExpression') {
          // `http.createServer(app)` serves `app`.
          for (const arg of node.arguments) add(arg);
          return;
        }
        if (node?.type !== 'Identifier') return;
        const variable = lookupVariable(node.name, sourceCode.getScope(node));
        if (variable === undefined || found.includes(variable)) return;
        found.push(variable);
        const def = variable.defs[0];
        if (def?.type === 'Variable') add(def.node.init);
      };
      if (
        bind.type === 'CallExpression' &&
        bind.callee.type === 'MemberExpression'
      )
        add(bind.callee.object);
      else if (bind.parent?.type === 'VariableDeclarator') add(bind.parent.id);
      return found;
    }

    /**
     * Is the app handed to code this file cannot see — `setupAuth(app)` from
     * another module — which may mount the auth middleware? Passing it to
     * `http(s).createServer` is only serving it.
     */
    function appEscapes(bind: TSESTree.Node): boolean {
      return appVariables(bind).some((variable) =>
        variable.references.some((ref) => {
          const call = ref.identifier.parent;
          if (
            call?.type !== 'CallExpression' ||
            !call.arguments.includes(ref.identifier as TSESTree.Identifier)
          )
            return false;
          // A same-file function is visible: its `.use(…)` calls already count.
          if (resolveFunction(call.callee, sourceCode.getScope(call)))
            return false;
          const callee = resolveModuleBinding(
            call.callee,
            sourceCode.getScope(call),
          );
          return !(
            callee !== undefined &&
            DEFAULT_ALL_INTERFACES[callee.module] === callee.path.join('.')
          );
        }),
      );
    }

    /** Is this receiver an Express app or a Node http(s) server? */
    function listensOnAllByDefault(receiver: TSESTree.Node): boolean {
      const app = builtBy(receiver);
      if (app === undefined) return false;
      // `createMcpExpressApp()` returns an Express app: its `host` option
      // picks the Host validation, not the interface `listen` binds.
      if (isMcpModule(app.module))
        return app.path[app.path.length - 1] === 'createMcpExpressApp';
      return DEFAULT_ALL_INTERFACES[app.module] === app.path.join('.');
    }

    const unhardened: Array<{
      node: TSESTree.NewExpression;
      transport: string;
    }> = [];
    let constructsTransport = false;
    /** Serves an SDK v2 transport or `createMcpHandler` — protection is the app's. */
    let servesV2 = false;
    /** Apps this file builds by hand, with their framework. */
    const rawApps: Array<{ node: TSESTree.Node; framework: string }> = [];
    let validatesHost = false;
    let authenticates = false;
    let customUse = false;
    /** Explicit all-interfaces binds: the node to report and its host. */
    const binds: Array<{ node: TSESTree.Node; host: string }> = [];
    /** `createMcpExpressApp({ host: '0.0.0.0' })` with no `allowedHosts`. */
    const openFactories: Array<{
      node: TSESTree.CallExpression;
      factory: string;
      host: string;
    }> = [];
    const handleRequestCalls: TSESTree.CallExpression[] = [];
    /**
     * Calls that hand a request to the MCP transport: `transport.handleRequest`
     * and a node handler built by an SDK adapter (`toNodeHandler(…)`).
     */
    const serveCalls: TSESTree.Node[] = [];

    /** Is `node` read off the request parameter `request` (`req.headers`, `c.req`)? */
    function rootedAt(
      node: TSESTree.Node,
      request: TSESLint.Scope.Variable,
    ): boolean {
      let current = node;
      while (current.type === 'MemberExpression') current = current.object;
      return (
        current.type === 'Identifier' &&
        lookupVariable(current.name, sourceCode.getScope(current)) === request
      );
    }

    /**
     * Does `test` read a request header — directly or through the bindings
     * it is computed from? Headers are where a non-ambient credential (a
     * bearer token, an API key) travels.
     */
    function readsHeader(
      test: TSESTree.Node,
      request: TSESLint.Scope.Variable,
    ): boolean {
      const seen = new Set<TSESLint.Scope.Variable>();
      const visit = (node: TSESTree.Node): boolean => {
        // A callback runs as part of the expression; another function does not.
        if (isFunctionNode(node) && node.parent?.type !== 'CallExpression')
          return false;
        if (
          node.type === 'MemberExpression' &&
          REQUEST_HEADER_READS.has(propertyName(node) ?? '') &&
          rootedAt(node.object, request)
        )
          return true;
        if (node.type === 'Identifier') {
          const variable = lookupVariable(node.name, sourceCode.getScope(node));
          if (variable === undefined || seen.has(variable)) return false;
          seen.add(variable);
          return variable.defs.some(
            (def) =>
              def.type === 'Variable' &&
              def.node.init !== null &&
              visit(def.node.init),
          );
        }
        for (const [key, value] of Object.entries(node)) {
          if (key === 'parent') continue;
          for (const child of Array.isArray(value) ? value : [value])
            if (
              child !== null &&
              typeof child === 'object' &&
              typeof (child as TSESTree.Node).type === 'string' &&
              visit(child as TSESTree.Node)
            )
              return true;
        }
        return false;
      };
      return visit(test);
    }

    /**
     * Is this serve call behind an inline credential check — an `if` that
     * reads a request header and returns (or throws) before the call?
     */
    function gatedInline(call: TSESTree.Node): boolean {
      // The request is the first parameter of an enclosing function — the
      // route handler, with any callbacks (`als.run(ctx, () => …)`) between.
      const requests: TSESLint.Scope.Variable[] = [];
      for (
        let node: TSESTree.Node | undefined = call.parent;
        node;
        node = node.parent
      ) {
        if (!isFunctionNode(node)) continue;
        // `app.post('/mcp', requireBearerAuth({ verifier }), handler)`.
        if (registrationsOf(node).some(behindSdkAuth)) return true;
        const param = node.params[0];
        if (param?.type !== 'Identifier') continue;
        // A parameter always declares its own variable on the function.
        requests.push(
          sourceCode
            .getDeclaredVariables(node)
            .find((v) => v.defs[0]?.name === param)!,
        );
      }
      let child: TSESTree.Node = call;
      for (
        let node: TSESTree.Node | undefined = call.parent;
        node;
        node = node.parent
      ) {
        if (node.type === 'BlockStatement')
          for (const statement of node.body) {
            if (statement === child) break;
            if (
              statement.type === 'IfStatement' &&
              exits(statement.consequent) &&
              requests.some((request) => readsHeader(statement.test, request))
            )
              return true;
          }
        child = node;
      }
      return false;
    }

    /** Is an SDK auth middleware (`requireBearerAuth(…)`) mounted on this route? */
    function behindSdkAuth(route: TSESTree.CallExpression): boolean {
      return route.arguments.some(
        (arg) =>
          arg.type === 'CallExpression' &&
          AUTH_EXPORTS.has(
            mcpExport(arg.callee, sourceCode.getScope(arg)) ?? '',
          ),
      );
    }

    /** Does every call that serves the transport check a credential first? */
    function servedBehindCredentialCheck(): boolean {
      return serveCalls.length > 0 && serveCalls.every(gatedInline);
    }

    /** A static host string, read inline or through a const. */
    function hostOf(node: TSESTree.Node): string | null {
      return staticString(resolve(node));
    }

    /** The option object a call was given, or null to abstain. */
    function readOptions(
      node: TSESTree.Node,
    ): Map<string, TSESTree.Node> | null {
      if (node.type === 'SpreadElement') return null;
      const object = resolve(node);
      if (object?.type !== 'ObjectExpression') return null;
      const options = new Map<string, TSESTree.Node>();
      for (const prop of object.properties) {
        // A spread may carry (or, after a key, override) any option.
        if (prop.type === 'SpreadElement') return null;
        const key = propertyKey(prop);
        // A computed key may name any option.
        if (key === undefined) return null;
        options.set(key, prop.value);
      }
      return options;
    }

    function rebindingProtection(options: Map<string, TSESTree.Node>): Tri {
      const flag = options.get('enableDnsRebindingProtection');
      if (flag === undefined) return 'no';
      const value = resolve(flag);
      if (value?.type !== 'Literal' || typeof value.value !== 'boolean')
        return 'unknown';
      return value.value ? 'yes' : 'no';
    }

    function nonEmptyHosts(options: Map<string, TSESTree.Node>): Tri {
      const hosts = options.get('allowedHosts');
      if (hosts === undefined) return 'no';
      const value = resolve(hosts);
      if (value?.type !== 'ArrayExpression') return 'unknown';
      return value.elements.length > 0 ? 'yes' : 'no';
    }

    function expressAppState(call: TSESTree.CallExpression): ExpressAppState {
      const arg = call.arguments[0];
      // `createMcpExpressApp()` defaults to 127.0.0.1 with localhost validation.
      if (arg === undefined) return { kind: 'guarded' };
      const options = readOptions(arg);
      // Any allowedHosts installs hostHeaderValidation (an empty list rejects all).
      if (options === null || options.has('allowedHosts'))
        return { kind: 'guarded' };
      const hostNode = options.get('host');
      if (hostNode === undefined) return { kind: 'guarded' };
      const host = hostOf(hostNode);
      if (host === null || LOOPBACK_HOSTS.has(host)) return { kind: 'guarded' };
      return ALL_INTERFACE_HOSTS.has(host)
        ? { kind: 'allInterfaces', host }
        : { kind: 'other' };
    }

    /** The calls a route handler function is passed to. */
    function registrationsOf(fn: FunctionNode): TSESTree.CallExpression[] {
      const parent = fn.parent;
      if (
        parent.type === 'CallExpression' &&
        (parent.arguments as readonly TSESTree.Node[]).includes(fn)
      )
        return [parent];
      const declared =
        fn.type === 'FunctionDeclaration'
          ? fn
          : parent.type === 'VariableDeclarator'
            ? parent
            : undefined;
      if (declared === undefined) return [];
      const calls: TSESTree.CallExpression[] = [];
      for (const variable of sourceCode.getDeclaredVariables(declared)) {
        for (const ref of variable.references) {
          const site = ref.identifier.parent;
          if (
            site.type === 'CallExpression' &&
            site.arguments.includes(ref.identifier as TSESTree.Identifier)
          )
            calls.push(site);
        }
      }
      return calls;
    }

    /** Is a route that calls `handleRequest` mounted behind a middleware argument? */
    function routeHasMiddleware(): boolean {
      for (const call of handleRequestCalls) {
        for (
          let node: TSESTree.Node | undefined = call.parent;
          node;
          node = node.parent
        ) {
          if (!isFunctionNode(node)) continue;
          // `app.post(path, middleware, handler)`: more than path + handler.
          if (registrationsOf(node).some((route) => route.arguments.length > 2))
            return true;
        }
      }
      return false;
    }

    /** `express()`, `new Hono()`, `fastify()` — an app this file builds. */
    function noteRawApp(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
      scope: TSESLint.Scope.Scope,
    ): void {
      const binding = resolveModuleBinding(node.callee, scope);
      if (
        binding !== undefined &&
        RAW_APPS[binding.module] === binding.path.join('.')
      )
        rawApps.push({ node, framework: binding.module });
    }

    /** Is the app built at `node` bound to a name that registers a route? */
    function registersRoute(node: TSESTree.Node): boolean {
      const declarator = node.parent;
      if (declarator?.type !== 'VariableDeclarator') return false;
      return sourceCode.getDeclaredVariables(declarator).some((variable) =>
        variable.references.some((ref) => {
          const member = ref.identifier.parent;
          return (
            member.type === 'MemberExpression' &&
            member.object === ref.identifier &&
            member.parent.type === 'CallExpression' &&
            member.parent.callee === member &&
            ROUTE_METHODS.has(propertyName(member) ?? '')
          );
        }),
      );
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        const scope = sourceCode.getScope(node);
        noteRawApp(node, scope);
        const binding = resolveModuleBinding(node.callee, scope);
        if (binding === undefined || !isMcpModule(binding.module)) return;
        // A default or namespace import names no transport (`String(undefined)`).
        const transport = String(binding.path[binding.path.length - 1]);
        const index = HTTP_TRANSPORTS.get(transport);
        if (index === undefined) return;
        constructsTransport = true;
        // An SSE session starts where its transport is built (the GET route).
        if (transport === 'SSEServerTransport') serveCalls.push(node);
        // SDK v2: the transport has no rebinding option; the app is judged.
        if (
          !TRANSPORT_OPTION_PACKAGES.some(
            (pkg) =>
              binding.module === pkg || binding.module.startsWith(`${pkg}/`),
          )
        ) {
          servesV2 = true;
          return;
        }
        const arg = node.arguments[index];
        if (arg === undefined) {
          unhardened.push({ node, transport });
          return;
        }
        const options = readOptions(arg);
        if (options === null) return;
        if (
          rebindingProtection(options) === 'no' ||
          nonEmptyHosts(options) === 'no'
        )
          unhardened.push({ node, transport });
      },

      CallExpression(node: TSESTree.CallExpression) {
        const scope = sourceCode.getScope(node);
        noteRawApp(node, scope);
        // `nodeHandler(req, res)` where `nodeHandler = toNodeHandler(…)`.
        if (node.callee.type === 'Identifier') {
          const init = constInitializer(node.callee, scope);
          if (
            init?.type === 'CallExpression' &&
            mcpExport(init.callee, scope) !== undefined
          )
            serveCalls.push(node);
        }
        const name = mcpExport(node.callee, scope);
        if (name !== undefined) {
          if (HOST_VALIDATORS.has(name)) validatesHost = true;
          else if (AUTH_EXPORTS.has(name)) authenticates = true;
          else if (name === 'createMcpHandler') servesV2 = true;
          else if (MCP_APP_FACTORIES.has(name)) {
            const state = expressAppState(node);
            if (state.kind === 'guarded') validatesHost = true;
            else if (state.kind === 'allInterfaces') {
              openFactories.push({ node, factory: name, host: state.host });
              binds.push({ node, host: state.host });
            }
          }
          return;
        }
        if (node.callee.type !== 'MemberExpression') return;
        const method = propertyName(node.callee);
        if (method === 'use') {
          if (
            node.arguments.some(
              (arg) => arg.type === 'Identifier' || isFunctionNode(arg),
            )
          )
            customUse = true;
        } else if (method === 'handleRequest') {
          handleRequestCalls.push(node);
          serveCalls.push(node);
        } else if (method === 'handlePostMessage') {
          // The legacy SSE transport's POST route.
          serveCalls.push(node);
        } else if (method === 'listen') {
          // `listen(port, host, …)` or `listen({ port, host })`.
          const [first, second] = node.arguments;
          const options =
            first?.type === 'ObjectExpression' ? readOptions(first) : null;
          const hostNode =
            first?.type === 'ObjectExpression'
              ? options?.get('host')
              : second !== undefined && !isFunctionNode(second)
                ? second
                : undefined;
          const host = hostNode === undefined ? null : hostOf(hostNode);
          if (host !== null && ALL_INTERFACE_HOSTS.has(host))
            binds.push({ node, host });
          // No host at all: an Express app or a Node `http` server binds
          // every interface (`::`). Fastify defaults to localhost and is not
          // matched; an options object that cannot be read is abstained on.
          else if (
            hostNode === undefined &&
            (first?.type !== 'ObjectExpression' || options !== null) &&
            listensOnAllByDefault(node.callee.object)
          )
            binds.push({ node, host: DEFAULT_LISTEN_HOST });
        }
      },

      'Program:exit'() {
        // A bearer token or API key is not sent by a browser on its own, so a
        // rebound page cannot get past a credential check: rebinding is moot.
        const gated = servedBehindCredentialCheck();
        if (!gated)
          for (const { node, factory, host } of openFactories)
            context.report({
              node,
              messageId: 'allInterfacesWithoutAllowedHosts',
              data: { factory, host },
            });
        if (!validatesHost && !gated) {
          for (const { node, transport } of unhardened)
            context.report({
              node,
              messageId: 'missingRebindingProtection',
              data: { transport },
            });
          if (servesV2)
            for (const { node, framework } of rawApps)
              if (registersRoute(node))
                context.report({
                  node,
                  messageId: 'appWithoutHostValidation',
                  data: { framework },
                });
        }
        if (
          !constructsTransport ||
          binds.length === 0 ||
          authenticates ||
          gated ||
          customUse ||
          routeHasMiddleware()
        )
          return;
        for (const { node, host } of binds)
          if (!appEscapes(node))
            context.report({ node, messageId: 'missingAuth', data: { host } });
      },
    };
  },
});
