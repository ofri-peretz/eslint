/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-guards
 * Requires @UseGuards decorator on controllers or route handlers
 * CWE-284: Improper Access Control
 *
 * @see https://cwe.mitre.org/data/definitions/284.html
 * @see https://docs.nestjs.com/guards
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import {
  decoratorCall,
  HTTP_METHOD_DECORATORS,
  enclosingClass,
  expressionName,
  findDecorator,
  hasDecorator,
  DEFAULT_AUTH_DECORATORS,
  collectImportOrigins,
  isAccessControlDecorator,
  isControllerClass,
  isRouteHandler,
  isTestFile,
  memberName,
  superClassName,
  type ClassNode,
} from '../../utils/nest-ast';

type MessageIds =
  'missingGuards' | 'emptyGuards' | 'missingRequiredGuard' | 'addGuards';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Guards that satisfy the rule. Empty means any guard. Default: [] */
  requiredGuards?: string[];
  /** Allow public endpoints (with @Public decorator). Default: true */
  allowPublicDecorator?: boolean;
  /** Skip rule if global guards are configured in main.ts. Default: false */
  assumeGlobalGuards?: boolean;
  /**
   * Extra decorator names that count as access control, on top of
   * @UseGuards and the well-known wrappers (@Auth, @Authenticated, @Roles...).
   */
  authDecorators?: string[];
  /**
   * Route path segments / handler names that are public by design and must not
   * require a guard. Replaces the default list when provided.
   */
  publicRoutes?: string[];
}

type RuleOptions = [Options?];

// Decorators that bypass guard requirements
const PUBLIC_DECORATORS = new Set([
  'Public',
  'SkipAuth',
  'AllowAnonymous',
  'NoAuth',
  // @nestjs/terminus marks a liveness/readiness probe, which is public by design.
  'HealthCheck',
]);

/**
 * Routes that cannot require authentication, because they are how a caller
 * *obtains* it — or how infrastructure probes the service.
 *
 * Demanding a guard on `POST /auth/login` is incoherent: nobody can log in if
 * logging in requires being logged in. Measured on the corpus, these accounted
 * for a large share of `require-guards` reports on correct code.
 *
 * The brute-force exposure these endpoints genuinely carry is covered by
 * `require-throttler`, which targets exactly this same set by default. Guards
 * and throttling divide the work: this rule protects private routes, that rule
 * protects public ones.
 */
const DEFAULT_PUBLIC_ROUTES = [
  'login',
  'signin',
  'sign-in',
  'logout',
  'signout',
  'sign-out',
  'signup',
  'sign-up',
  'register',
  'registration',
  'refresh',
  'forgot-password',
  'reset-password',
  'forgot',
  'verify',
  'verify-email',
  'confirm',
  'callback',
  'webhook',
  'webhooks',
  'health',
  'healthz',
  'readiness',
  'liveness',
  'ping',
  'public',
  'oauth',
  'sso',
];

/** A route handler awaiting resolution once every class in the file is known. */
interface Pending {
  node: TSESTree.MethodDefinition;
  cls: ClassNode;
  name: string;
}

export const requireGuards = createRule<RuleOptions, MessageIds>({
  name: 'require-guards',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-guards.md',
      description:
        'Requires @UseGuards decorator on controllers or route handlers',
      cwe: 'CWE-284',
      cvss: 9.8,
    },
    hasSuggestions: true,
    messages: {
      missingGuards: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authorization Guards',
        cwe: 'CWE-284',
        cvss: 9.8,
        description:
          'Controller/route handler {{name}} lacks @UseGuards for access control',
        severity: 'CRITICAL',
        fix: 'Add @UseGuards(AuthGuard): @UseGuards(AuthGuard) before the handler',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      emptyGuards: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Empty Guard List',
        cwe: 'CWE-284',
        cvss: 9.8,
        description:
          '@UseGuards() on {{name}} declares no guard, so it enforces nothing',
        severity: 'CRITICAL',
        fix: 'Pass a guard class: @UseGuards(AuthGuard)',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      missingRequiredGuard: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Required Guard',
        cwe: 'CWE-284',
        cvss: 9.8,
        description:
          'Route handler {{name}} is guarded, but none of the required guards ({{required}}) is applied',
        severity: 'CRITICAL',
        fix: 'Add one of the required guards: @UseGuards({{firstRequired}})',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      addGuards: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Authentication Guard',
        description: 'Add @UseGuards decorator to protect this endpoint',
        severity: 'LOW',
        fix: 'import { UseGuards } from "@nestjs/common"; @UseGuards(AuthGuard)',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          requiredGuards: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          allowPublicDecorator: { type: 'boolean', default: true },
          assumeGlobalGuards: { type: 'boolean', default: false },
          authDecorators: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          publicRoutes: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      requiredGuards: [],
      allowPublicDecorator: true,
      assumeGlobalGuards: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = true,
      allowPublicDecorator = true,
      assumeGlobalGuards = false,
      requiredGuards = [],
      authDecorators = [],
      publicRoutes,
    } = options as Options;

    const publicSet = new Set(
      (publicRoutes ?? DEFAULT_PUBLIC_ROUTES).map((r) =>
        r.toLowerCase().replace(/^\/+|\/+$/g, ''),
      ),
    );

    const origins = collectImportOrigins(context.sourceCode.ast);
    const authNames = new Set([...DEFAULT_AUTH_DECORATORS, ...authDecorators]);
    // @UseGuards is handled separately: it is the only one whose *arguments*
    // we can inspect, so an empty argument list is a finding rather than proof.
    authNames.delete('UseGuards');

    // Skip entirely if global guards are assumed (configured in main.ts)
    if (assumeGlobalGuards) {
      return {};
    }

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    /** Class name -> declaration, so `extends` can be followed within the file. */
    const classesByName = new Map<string, ClassNode>();
    const pending: Pending[] = [];

    /**
     * Guard class names applied by the @UseGuards decorators on a node.
     * Returns null when there is no @UseGuards at all, so callers can tell
     * "unguarded" apart from "@UseGuards() with an empty list".
     */
    function guardNames(
      decorators: TSESTree.Decorator[] | undefined,
    ): string[] | null {
      const dec = findDecorator(decorators, 'UseGuards');
      if (!dec) return null;
      const call = decoratorCall(dec);
      // A bare `@UseGuards` reference names no guard.
      if (!call) return [];
      // `AuthGuard`, `new RolesGuard()`, `AuthGuard('jwt')` and `passport.AuthGuard`
      // all resolve to the guard's own name.
      return call.arguments.map(expressionName);
    }

    /**
     * Guards applied to a class, following `extends` within this file so a
     * controller inheriting `@UseGuards` from a base class is not reported.
     */
    function inheritedGuardNames(cls: ClassNode): string[] | null {
      const seen = new Set<ClassNode>();
      let current: ClassNode | null = cls;
      const collected: string[] = [];
      let found = false;

      while (current && !seen.has(current)) {
        seen.add(current);
        const own = guardNames(current.decorators);
        if (own !== null) {
          found = true;
          collected.push(...own);
        }
        const superName: string | null = superClassName(current);
        current = superName ? (classesByName.get(superName) ?? null) : null;
      }

      return found ? collected : null;
    }

    function hasPublicDecorator(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      if (!allowPublicDecorator) return false;
      return hasDecorator(decorators, PUBLIC_DECORATORS);
    }

    /**
     * Route path segments declared by a decorator.
     *
     * Handles both NestJS forms: `@Controller('auth')` and the options object
     * `@Controller({ path: 'auth', version: '1' })`, which real codebases use
     * whenever they version an API.
     */
    function pathSegments(decorator: TSESTree.Decorator): string[] {
      const call = decoratorCall(decorator);
      if (!call) return [];
      const out: string[] = [];
      const push = (v: unknown) => {
        if (typeof v === 'string')
          out.push(...v.toLowerCase().split('/').filter(Boolean));
      };
      for (const arg of call.arguments) {
        if (arg.type === AST_NODE_TYPES.Literal) {
          push(arg.value);
        } else if (arg.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of arg.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              !prop.computed &&
              prop.key.type === AST_NODE_TYPES.Identifier &&
              prop.key.name === 'path' &&
              prop.value.type === AST_NODE_TYPES.Literal
            ) {
              push(prop.value.value);
            }
          }
        }
      }
      return out;
    }

    /**
     * Whether this route is public by design — the controller prefix, the route
     * path or the handler name names an authentication entry point or a probe.
     */
    function isPublicByDesign(
      node: TSESTree.MethodDefinition,
      cls: ClassNode,
    ): boolean {
      const handler = (memberName(node) ?? '').toLowerCase();
      if (publicSet.has(handler)) return true;

      // Both decorators are guaranteed present: the caller already established
      // this is a route handler on a @Controller class.
      const segments = [
        ...pathSegments(
          findDecorator(cls.decorators, 'Controller') as TSESTree.Decorator,
        ),
        ...pathSegments(
          findDecorator(
            node.decorators,
            HTTP_METHOD_DECORATORS,
          ) as TSESTree.Decorator,
        ),
      ];
      return segments.some((seg) => publicSet.has(seg));
    }

    function registerClass(node: ClassNode): void {
      if (node.id?.name) {
        classesByName.set(node.id.name, node);
      }
    }

    return {
      ClassDeclaration: registerClass,
      ClassExpression: registerClass,

      MethodDefinition(node: TSESTree.MethodDefinition) {
        const cls = enclosingClass(node);
        if (!cls || !isControllerClass(cls)) return;
        if (!isRouteHandler(node)) return;
        if (hasPublicDecorator(node.decorators)) return;
        if (hasPublicDecorator(cls.decorators)) return;

        pending.push({ node, cls, name: memberName(node) ?? '<anonymous>' });
      },

      'Program:exit'() {
        for (const { node, cls, name } of pending) {
          // A project-specific auth decorator (@Auth, @Authenticated, ...) is
          // access control even though it never mentions @UseGuards.
          // `UseGuards` is deliberately excluded here: it is the one decorator
          // whose *arguments* we inspect, so its presence is a question (which
          // guards? any at all?), not an answer.
          const isAuth = (d: TSESTree.Decorator) =>
            isAccessControlDecorator(d, origins, authNames, true);
          // Both are arrays: a pending entry is only created for a route
          // handler on a @Controller class.
          if (
            (node.decorators as TSESTree.Decorator[]).some(isAuth) ||
            (cls.decorators as TSESTree.Decorator[]).some(isAuth)
          ) {
            continue;
          }

          // Authentication entry points and health probes cannot require auth.
          if (isPublicByDesign(node, cls)) continue;

          const classGuards = inheritedGuardNames(cls);
          const methodGuards = guardNames(node.decorators);

          // No @UseGuards anywhere on the class chain or the method.
          if (classGuards === null && methodGuards === null) {
            context.report({
              node,
              messageId: 'missingGuards',
              data: { name },
              suggest: [{ messageId: 'addGuards', fix: () => null }],
            });
            continue;
          }

          const applied = [
            ...(classGuards ?? []),
            ...(methodGuards ?? []),
          ].filter(Boolean);

          // @UseGuards() present but naming nothing — enforces nothing.
          if (applied.length === 0) {
            context.report({
              node,
              messageId: 'emptyGuards',
              data: { name },
              suggest: [{ messageId: 'addGuards', fix: () => null }],
            });
            continue;
          }

          // When specific guards are required, a different guard does not count.
          if (
            requiredGuards.length > 0 &&
            !applied.some((g) => requiredGuards.includes(g))
          ) {
            context.report({
              node,
              messageId: 'missingRequiredGuard',
              data: {
                name,
                required: requiredGuards.join(', '),
                firstRequired: requiredGuards[0],
              },
              suggest: [{ messageId: 'addGuards', fix: () => null }],
            });
          }
        }
      },
    };
  },
});
