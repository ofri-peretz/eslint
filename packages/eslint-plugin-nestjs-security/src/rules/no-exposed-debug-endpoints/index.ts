/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect debug endpoints without auth in NestJS applications
 *
 * Scope note: this rule inspects route paths only — the `@Controller()` prefix
 * and the argument of the HTTP-method decorator. It deliberately does *not*
 * look at free-standing string literals: an earlier version matched every
 * string in every file, so a service containing `'debug'` or `'health'`
 * produced errors on code that declared no routes at all.
 *
 * CWE-489: Active Debug Code
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  decoratorCall,
  decoratorName,
  enclosingClass,
  findDecorator,
  DEFAULT_AUTH_DECORATORS,
  collectImportOrigins,
  decoratorSource,
  isAccessControlDecorator,
  moduleRole,
  HTTP_METHOD_DECORATORS,
  isTestFile,
  type ClassNode,
} from '../../utils/nest-ast';

type MessageIds = 'violationDetected';

export interface Options {
  /** Path segments treated as debug/administrative surfaces. */
  endpoints?: string[];
  /** File path substrings to skip. */
  ignoreFiles?: string[];
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Extra decorator names that count as access control. */
  authDecorators?: string[];
}

type RuleOptions = [Options?];

/**
 * Segments that denote a debug or administrative surface.
 *
 * `health` is intentionally absent: `@nestjs/terminus` ships a public health
 * endpoint as the documented pattern, so flagging it is noise, not a finding.
 */
const DEFAULT_DEBUG_PATHS = [
  'debug',
  '__debug__',
  'admin',
  '_admin',
  'internal',
  '_internal',
  'dev',
  'test',
  'metrics',
  'actuator',
];

/** Split a route path into comparable, lower-cased segments. */
function pathSegments(value: string): string[] {
  return value
    .toLowerCase()
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every string literal a decorator was called with (handles array args). */
function literalArgs(decorator: TSESTree.Decorator): TSESTree.Literal[] {
  const call = decoratorCall(decorator);
  if (!call) return [];
  const out: TSESTree.Literal[] = [];
  for (const arg of call.arguments) {
    if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
      out.push(arg);
    } else if (arg.type === AST_NODE_TYPES.ArrayExpression) {
      for (const el of arg.elements) {
        if (
          el &&
          el.type === AST_NODE_TYPES.Literal &&
          typeof el.value === 'string'
        ) {
          out.push(el);
        }
      }
    }
  }
  return out;
}

export const noExposedDebugEndpoints = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-debug-endpoints',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-exposed-debug-endpoints.md',
      description: 'Detect debug endpoints without auth in NestJS applications',
      cwe: 'CWE-489',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Debug Endpoint',
        cwe: 'CWE-489',
        cvss: 7.5,
        description:
          'Debug/admin route "{{path}}" is reachable without any @UseGuards',
        severity: 'HIGH',
        fix: 'Guard it (@UseGuards(AdminGuard)) or remove the route from production builds',
        documentationLink: 'https://cwe.mitre.org/data/definitions/489.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          endpoints: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom list of debug/admin path segments to flag',
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of file path substrings to ignore',
          },
          allowInTests: { type: 'boolean', default: true },
          authDecorators: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options = {}]) {
    const {
      endpoints,
      ignoreFiles = [],
      allowInTests = true,
      authDecorators = [],
    } = options;
    const origins = collectImportOrigins(context.sourceCode.ast);
    const authNames = new Set([...DEFAULT_AUTH_DECORATORS, ...authDecorators]);
    const debugPaths = (endpoints ?? DEFAULT_DEBUG_PATHS).map((p) =>
      p.toLowerCase().replace(/^\/+|\/+$/g, ''),
    );
    const filename = context.filename;

    if (ignoreFiles.some((pattern) => filename.includes(pattern))) {
      return {};
    }
    if (allowInTests && isTestFile(filename)) {
      return {};
    }

    const debugSet = new Set(debugPaths);

    /**
     * Decorators that demonstrably do not apply access control, so their
     * presence still lets us claim a route is unguarded.
     */
    const NON_AUTH_DECORATORS = new Set<string>([
      ...HTTP_METHOD_DECORATORS,
      'Controller',
      'HttpCode',
      'Header',
      'Redirect',
      'Render',
      'Version',
      'SerializeOptions',
      'UseInterceptors',
      'UsePipes',
      'UseFilters',
      'Sse',
      'Bind',
    ]);

    /** A route is protected if the method or its class declares access control. */
    function isGuarded(
      node: TSESTree.MethodDefinition,
      cls: ClassNode,
    ): boolean {
      // Both are arrays here: the caller established this is a route handler
      // on a @Controller class, so each carries at least one decorator.
      const isAuth = (d: TSESTree.Decorator) =>
        isAccessControlDecorator(d, origins, authNames);
      return (
        (node.decorators as TSESTree.Decorator[]).some(isAuth) ||
        (cls.decorators as TSESTree.Decorator[]).some(isAuth)
      );
    }

    /**
     * Whether every decorator on the route is one we recognise.
     *
     * This rule reports "reachable without any @UseGuards" at CWE-489. Without
     * cross-file type information we cannot know what an unfamiliar decorator
     * does — immich protects its admin routes with `@MaintenanceRoute()`, which
     * is defined in `maintenance-auth.guard.ts` and applies a guard. Every one
     * of this rule's corpus findings was a route protected that way.
     *
     * So when anything unrecognised is applied, we abstain rather than assert.
     * A missed debug route is recoverable; telling a maintainer their guarded
     * admin endpoint is wide open is not, and it is the claim that would lose
     * us the audience.
     */
    function allDecoratorsUnderstood(
      node: TSESTree.MethodDefinition,
      cls: ClassNode,
    ): boolean {
      // Both are guaranteed non-empty here: the caller already found an HTTP
      // decorator on the method and @Controller on the class.
      const all = [
        ...(node.decorators as TSESTree.Decorator[]),
        ...(cls.decorators as TSESTree.Decorator[]),
      ];
      return all.every((d) => {
        // Anything from a package we recognise is accounted for — a Swagger or
        // TypeORM decorator cannot be secretly applying a guard.
        const source = decoratorSource(d, origins);
        if (source && moduleRole(source)) return true;
        const name = decoratorName(d);
        return (
          NON_AUTH_DECORATORS.has(name) ||
          authNames.has(name) ||
          /^Api[A-Z]/.test(name)
        );
      });
    }

    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        // A MethodDefinition is always a ClassBody child, so this is non-null.
        const cls = enclosingClass(node) as ClassNode;

        const controllerDecorator = findDecorator(cls.decorators, 'Controller');
        if (!controllerDecorator) return;

        const routeDecorator = findDecorator(
          node.decorators,
          HTTP_METHOD_DECORATORS,
        );
        if (!routeDecorator) return;
        if (isGuarded(node, cls)) return;
        if (!allDecoratorsUnderstood(node, cls)) return;

        const candidates = [
          ...literalArgs(controllerDecorator),
          ...literalArgs(routeDecorator),
        ];

        for (const literal of candidates) {
          const raw = String(literal.value);
          const hit = pathSegments(raw).find((segment) =>
            debugSet.has(segment),
          );
          if (hit) {
            context.report({
              node: node.key,
              messageId: 'violationDetected',
              data: { path: raw },
            });
            // One report per route is enough; the finding is the route.
            return;
          }
        }
      },
    };
  },
});
