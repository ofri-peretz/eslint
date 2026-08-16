/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require server-side authorization checks
 *
 * CWE-602 is "client-side enforcement of server-side security". Both halves of
 * that sentence are load-bearing, and the second one is what this rule used to
 * be missing entirely.
 *
 * Measured in `benchmarks/rule-corpus/secure-coding__require-backend-authorization/`:
 * with no evidence about where a file runs, the rule reported an Express
 * authorization middleware, a NestJS `CanActivate` guard and a Next.js route
 * handler — the three canonical SERVER-side enforcement points, and precisely
 * the code its own fix text ("Move authorization checks to server-side API
 * endpoints") asks a developer to write. It also reported `element.role`, the
 * ARIA attribute. Precision on that corpus was 37.5%.
 *
 * A finding now needs two things, both structural:
 *
 *   1. an authorization decision — a claim-shaped property read reaching the
 *      test of an `if`, the discriminant of a `switch`, or one binding hop
 *      behind either;
 *   2. proof the file runs in a browser — a `'use client'` directive, a JSX
 *      element, or a reference resolving to a browser-only global — and NO
 *      import of a server-only module.
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * Property names that hold an authorization claim. REPLACES the built-in
   * list. Default: DEFAULT_AUTH_PROPERTIES
   */
  authProperties?: string[];

  /** Extra claim property names, ON TOP of the built-ins. Default: [] */
  additionalAuthProperties?: string[];

  /**
   * Globals whose presence proves the file runs in a browser. REPLACES the
   * built-in list. Default: DEFAULT_BROWSER_GLOBALS
   */
  browserGlobals?: string[];

  /** Extra browser-only globals, ON TOP of the built-ins. Default: [] */
  additionalBrowserGlobals?: string[];

  /**
   * Module specifiers that can only load in a server process, which suppress
   * the finding outright. REPLACES the built-in list.
   * Default: DEFAULT_SERVER_MODULES
   */
  serverModules?: string[];

  /** Extra server-only module specifiers, ON TOP of the built-ins. Default: [] */
  additionalServerModules?: string[];
}

type RuleOptions = [Options?];

/**
 * Property names that hold an authorization claim.
 *
 * Exact membership against a closed set, never a substring test: `role` must
 * not match `roleplay` and `admin` must not match `adminEmail`. The option
 * changes WHICH names are watched; it never changes that matching is exact.
 *
 * This list is the rule's one irreducible guess, and the corpus records its
 * cost — a client-side gate on `user.accessLevel` is invisible here. Adding
 * `accessLevel`, `tier` and `scope` to the DEFAULT would trade that false
 * negative for false positives on every pricing tier and OAuth scope in the
 * ecosystem. A codebase where `tier` really is a permission can now say so
 * through `additionalAuthProperties` instead of turning the rule off.
 */
const DEFAULT_AUTH_PROPERTIES = [
  'role',
  'roles',
  'isAdmin',
  'isAuthenticated',
  'isAuthorized',
  'permissions',
  'admin',
];

/**
 * Globals that exist only in a document environment.
 *
 * A reference that resolves to none of the file's own bindings and carries one
 * of these names is a browser API, which is direct evidence about where the
 * code runs. Five names out of a very large surface, so it is a default and not
 * a fact: a worker (`WorkerGlobalScope`) or an extension (`chrome`) is just as
 * much a client, and neither is listed.
 */
const DEFAULT_BROWSER_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
];

/**
 * Modules that can only be loaded inside a server process.
 *
 * Importing any of them is proof the file is not shipped to a browser, so the
 * authorization check in it is the server-side enforcement CWE-602 asks for.
 * An in-house server framework belongs here too, which is what
 * `additionalServerModules` is for — without it, every guard written against a
 * private framework reports as client-side enforcement.
 */
const DEFAULT_SERVER_MODULES = [
  'express',
  'fastify',
  'koa',
  '@hapi/hapi',
  '@nestjs/common',
  '@nestjs/core',
  'next/server',
  'http',
  'https',
  'node:http',
  'node:https',
];

/**
 * The statically knowable property name of a member access.
 *
 * `user.role` and `user['role']` are the same read; a computed access through a
 * variable is not knowable, and `this.#role` names a private field that no
 * authorization claim arrives through.
 */
const memberPropertyName = (node: TSESTree.MemberExpression): string | undefined => {
  if (node.computed) {
    return node.property.type === AST_NODE_TYPES.Literal && typeof node.property.value === 'string'
      ? node.property.value
      : undefined;
  }
  return node.property.type === AST_NODE_TYPES.Identifier ? node.property.name : undefined;
};

export const requireBackendAuthorization = createRule<RuleOptions, MessageIds>({
  name: 'require-backend-authorization',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/require-backend-authorization.md',
      description: 'Require server-side authorization checks',
      cwe: 'CWE-602',
      cvss: 6.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Client-Side Authorization',
        cwe: 'CWE-602',
        description: 'Authorization logic in client code - easily bypassed',
        severity: 'CRITICAL',
        fix: 'Move authorization checks to server-side API endpoints',
        documentationLink: 'https://cwe.mitre.org/data/definitions/602.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          authProperties: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_AUTH_PROPERTIES,
            description:
              'Property names that hold an authorization claim, matched as an exact property name. Replaces the built-in list.',
          },
          additionalAuthProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra claim property names, on top of `authProperties`.',
          },
          browserGlobals: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_BROWSER_GLOBALS,
            description:
              'Globals whose unresolved reference proves the file runs in a browser. Replaces the built-in list.',
          },
          additionalBrowserGlobals: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra browser-only globals, on top of `browserGlobals`.',
          },
          serverModules: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SERVER_MODULES,
            description:
              'Module specifiers that can only load in a server process; importing one suppresses the finding. Replaces the built-in list.',
          },
          additionalServerModules: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra server-only module specifiers, on top of `serverModules`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      authProperties: DEFAULT_AUTH_PROPERTIES,
      additionalAuthProperties: [],
      browserGlobals: DEFAULT_BROWSER_GLOBALS,
      additionalBrowserGlobals: [],
      serverModules: DEFAULT_SERVER_MODULES,
      additionalServerModules: [],
    },
  ],
  create(context, [options = {}]) {
    const {
      authProperties = DEFAULT_AUTH_PROPERTIES,
      additionalAuthProperties = [],
      browserGlobals = DEFAULT_BROWSER_GLOBALS,
      additionalBrowserGlobals = [],
      serverModules = DEFAULT_SERVER_MODULES,
      additionalServerModules = [],
    } = options as Options;

    const authNames = new Set([...authProperties, ...additionalAuthProperties]);
    const browserNames = new Set([...browserGlobals, ...additionalBrowserGlobals]);
    const serverSpecifiers = new Set([...serverModules, ...additionalServerModules]);

    const sourceCode = context.sourceCode;

    /** Findings held back until `Program:exit` can say where the file runs. */
    const candidates: TSESTree.Node[] = [];

    /** Variables whose initialiser reads an authorization claim. */
    const claimBackedVariables = new Set<TSESLint.Scope.Variable>();

    /** `if (canExport)` / `switch (level)` — resolved once the file is walked. */
    const indirectTests: { node: TSESTree.Node; identifier: TSESTree.Identifier }[] = [];

    /** Set by the JSX visitors; JSX in a file means a rendered user interface. */
    let hasJsx = false;

    const noteIndirect = (test: TSESTree.Node, node: TSESTree.Node) => {
      if (test.type === AST_NODE_TYPES.Identifier) indirectTests.push({ node, identifier: test });
    };

    /**
     * The variable an identifier reads, found by walking OUT from the scope the
     * identifier sits in.
     *
     * The walk is not decoration: a `switch` opens its own block scope for
     * `case`-level `let` declarations, but the discriminant is evaluated
     * outside it, so the reference lives one scope up. Looking only in
     * `getScope(identifier)` silently lost every `switch (level)` hop.
     */
    const resolveReference = (
      identifier: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | undefined => {
      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
        scope;
        scope = scope.upper
      ) {
        const reference = scope.references.find((entry) => entry.identifier === identifier);
        if (reference) return reference.resolved ?? undefined;
      }
      return undefined;
    };

    return {
      JSXElement() {
        hasJsx = true;
      },
      JSXFragment() {
        hasJsx = true;
      },

      /**
       * One visitor for every claim read in the file, walked up to whatever
       * consumes it. Using ESLint's own traversal rather than a hand-rolled
       * one is what lets `user?.role === 'admin'` (a ChainExpression wrapper)
       * and `user.permissions.includes('billing:write')` (a CallExpression) be
       * seen at all — the previous implementation matched only a bare
       * MemberExpression test or a two-sided BinaryExpression, so both of those
       * ordinary React shapes read as no authorization whatsoever.
       */
      MemberExpression(node: TSESTree.MemberExpression) {
        const property = memberPropertyName(node);
        if (property === undefined || !authNames.has(property)) return;

        let current: TSESTree.Node = node;
        // `parent.parent` is optional at the top of the tree, so the update
        // clause cannot narrow it for the next iteration. Widening the loop
        // variable and re-testing each pass keeps the walk honest without a
        // non-null assertion.
        for (
          let parent: TSESTree.Node | undefined = node.parent;
          parent;
          current = parent, parent = parent.parent
        ) {
          if (parent.type === AST_NODE_TYPES.IfStatement && parent.test === current) {
            candidates.push(parent);
            return;
          }
          if (parent.type === AST_NODE_TYPES.SwitchStatement && parent.discriminant === current) {
            candidates.push(parent);
            return;
          }
          // `const canExport = user.role === 'owner'` — every codebase that
          // runs a complexity lint lifts the comparison out of the branch.
          if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.init === current) {
            for (const variable of sourceCode.getDeclaredVariables(parent)) {
              claimBackedVariables.add(variable);
            }
            return;
          }
        }
      },

      IfStatement(node: TSESTree.IfStatement) {
        noteIndirect(node.test, node);
      },

      // `switch (user.role)` fans one claim out to more than two destinations
      // and is exactly as client-side as the `if` it replaces.
      SwitchStatement(node: TSESTree.SwitchStatement) {
        noteIndirect(node.discriminant, node);
      },

      'Program:exit'(program: TSESTree.Program) {
        for (const { node, identifier } of indirectTests) {
          const resolved = resolveReference(identifier);
          if (!resolved || !claimBackedVariables.has(resolved)) continue;
          // A rebound binding may hold something else by the time the branch
          // runs, so only a single-assignment binding carries the claim.
          if (resolved.references.filter((reference) => reference.isWrite()).length !== 1) continue;
          candidates.push(node);
        }

        if (candidates.length === 0) return;

        // Server evidence wins outright: this file cannot reach a browser, so
        // the check in it IS the server-side enforcement CWE-602 prescribes.
        const importsServerModule = program.body.some(
          (statement) =>
            statement.type === AST_NODE_TYPES.ImportDeclaration &&
            serverSpecifiers.has(String(statement.source.value)),
        );
        if (importsServerModule) return;

        const hasUseClient = program.body.some(
          (statement) =>
            statement.type === AST_NODE_TYPES.ExpressionStatement &&
            statement.directive === 'use client',
        );

        const touchesBrowserGlobal = sourceCode
          .getScope(program)
          .through.some((reference) => browserNames.has(reference.identifier.name));

        if (!hasUseClient && !hasJsx && !touchesBrowserGlobal) return;

        for (const node of candidates) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
