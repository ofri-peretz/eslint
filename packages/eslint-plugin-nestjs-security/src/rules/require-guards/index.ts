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
  getHttpMethodDecorator,
  getRoutePath,
  getUseGuardsGuardNames,
  hasDecoratorNamed,
  hasUnresolvedDecorator,
  isControllerClass,
  PUBLIC_DECORATORS,
} from '../../utils/decorators';
import { getProjectContext } from '../../utils/project-context';

type MessageIds =
  | 'missingGuards'
  | 'missingRequiredGuards'
  | 'addGuards';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /**
   * Specific guard classes that satisfy the rule. Empty (the default) accepts
   * any `@UseGuards(...)`. When set, a route must name one of these guards —
   * `@UseGuards(RolesGuard)` no longer satisfies `requiredGuards:
   * ['JwtAuthGuard']`.
   *
   * The exemptions stay conservative: a `@UseGuards` whose arguments cannot be
   * named statically, an unresolved composite decorator
   * (`allowCustomDecorators`) and a global `APP_GUARD` (`detectGlobalGuards`)
   * all still suppress the report, because none of them can be *proven* not to
   * apply the required guard.
   */
  requiredGuards?: string[];
  /** Allow public endpoints (with @Public decorator). Default: true */
  allowPublicDecorator?: boolean;
  /** Skip rule entirely, without scanning the project. Default: false */
  assumeGlobalGuards?: boolean;
  /**
   * Treat a route/controller carrying a decorator this plugin cannot resolve
   * (a project-owned composite such as `@AuthJwtAccessProtected()`) as
   * possibly guarded. Default: true
   */
  allowCustomDecorators?: boolean;
  /**
   * Suppress findings when the project registers a global guard via
   * `APP_GUARD` or `app.useGlobalGuards()`. Default: true
   */
  detectGlobalGuards?: boolean;
  /**
   * Handler names / route paths that are unauthenticated by design. Matched
   * case-insensitively against the method name and the route path with
   * separators removed.
   */
  publicRoutePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Route names that cannot have an auth guard by definition — the endpoints a
 * caller uses *to obtain* credentials, plus the standard unauthenticated
 * infrastructure routes. Requiring `@UseGuards` on `POST /auth/login` is not a
 * finding, it is a contradiction.
 */
const DEFAULT_PUBLIC_ROUTE_PATTERNS = [
  'login',
  'signin',
  'logout',
  'signout',
  'register',
  'signup',
  'refresh',
  'refreshtoken',
  'forgotpassword',
  'passwordforgot',
  'resetpassword',
  'passwordreset',
  'confirmemail',
  'emailconfirm',
  'confirmnewemail',
  'verifyemail',
  'emailverify',
  'health',
  'healthcheck',
  'liveness',
  'readiness',
  'ping',
  'metrics',
  'version',
  'appinfo',
  'webhook',
  'webhooks',
  'callback',
  'oauthcallback',
];

/** `confirm-new/email` and `confirmNewEmail` must compare equal. */
function normalizeRouteToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const requireGuards = createRule<RuleOptions, MessageIds>({
  name: 'require-guards',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-guards.md',
      description: 'Requires @UseGuards decorator on controllers or route handlers',
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
        description: 'Controller/route handler {{name}} lacks @UseGuards for access control',
        severity: 'CRITICAL',
        fix: 'Add @UseGuards(AuthGuard): @UseGuards(AuthGuard) before the handler',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      missingRequiredGuards: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Required Authorization Guard',
        cwe: 'CWE-284',
        cvss: 9.8,
        description:
          'Controller/route handler {{name}} is not protected by any of the required guards ({{guards}})',
        severity: 'CRITICAL',
        fix: 'Add one of the required guards: @UseGuards({{guards}}) before the handler',
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
          requiredGuards: { type: 'array', items: { type: 'string' }, default: [] },
          allowPublicDecorator: { type: 'boolean', default: true },
          assumeGlobalGuards: { type: 'boolean', default: false },
          allowCustomDecorators: { type: 'boolean', default: true },
          detectGlobalGuards: { type: 'boolean', default: true },
          publicRoutePatterns: { type: 'array', items: { type: 'string' } },
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
      allowCustomDecorators: true,
      detectGlobalGuards: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = true,
      requiredGuards = [],
      allowPublicDecorator = true,
      assumeGlobalGuards = false,
      allowCustomDecorators = true,
      detectGlobalGuards = true,
      publicRoutePatterns = DEFAULT_PUBLIC_ROUTE_PATTERNS,
    } = options as Options;

    // Skip entirely if global guards are assumed (configured in main.ts)
    if (assumeGlobalGuards) {
      return {};
    }
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const publicTokens = new Set(publicRoutePatterns.map(normalizeRouteToken));
    const requiredGuardNames = new Set(requiredGuards);

    // Class-level state
    let isController = false;
    let classIsExempt = false;

    /** `@Public()`-style opt-out. */
    function hasPublicDecorator(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      if (!allowPublicDecorator) return false;
      return hasDecoratorNamed(decorators, PUBLIC_DECORATORS);
    }

    /**
     * Does this decorator list carry a guard that satisfies the requirement?
     *
     * Without `requiredGuards`, any `@UseGuards` counts. With it, the guard
     * must be named — except when it cannot be named statically, which is not
     * evidence of absence.
     */
    function satisfiesGuardRequirement(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      const guardNames = getUseGuardsGuardNames(decorators);
      if (guardNames.length === 0) return false;
      if (requiredGuardNames.size === 0) return true;
      return guardNames.some(
        (name) => name === '' || requiredGuardNames.has(name),
      );
    }

    /** A decorator we cannot resolve may be a composite that applies guards. */
    function hasPossibleGuardDecorator(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      return allowCustomDecorators && hasUnresolvedDecorator(decorators);
    }

    /** Endpoints that exist to hand out credentials cannot require them. */
    function isPublicByDesign(
      methodName: string,
      httpDecorator: TSESTree.Decorator,
    ): boolean {
      if (publicTokens.has(normalizeRouteToken(methodName))) return true;
      const path = getRoutePath(httpDecorator);
      if (path === null) return false;
      return path
        .split('/')
        .some((segment) => segment !== '' && publicTokens.has(normalizeRouteToken(segment)));
    }

    /** A global `APP_GUARD` protects every route in the project. */
    function hasProjectGlobalGuard(): boolean {
      return detectGlobalGuards && getProjectContext(context).hasGlobalAuthGuard;
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        isController = isControllerClass(node.decorators);
        classIsExempt =
          satisfiesGuardRequirement(node.decorators) ||
          hasPublicDecorator(node.decorators) ||
          hasPossibleGuardDecorator(node.decorators);
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        // Only check if we're in a controller and method is a route handler
        if (!isController || classIsExempt) return;

        // Skip constructor and non-public methods
        if (
          node.key.type === AST_NODE_TYPES.Identifier &&
          (node.key.name === 'constructor' || node.key.name.startsWith('_'))
        ) {
          return;
        }

        const httpDecorator = getHttpMethodDecorator(node.decorators);
        if (httpDecorator === null) return;

        if (
          hasPublicDecorator(node.decorators) ||
          satisfiesGuardRequirement(node.decorators) ||
          hasPossibleGuardDecorator(node.decorators)
        ) {
          return;
        }

        const methodName =
          node.key.type === AST_NODE_TYPES.Identifier ? node.key.name : '<anonymous>';

        if (isPublicByDesign(methodName, httpDecorator)) return;
        if (hasProjectGlobalGuard()) return;

        context.report({
          node,
          messageId:
            requiredGuardNames.size === 0
              ? 'missingGuards'
              : 'missingRequiredGuards',
          data: { name: methodName, guards: requiredGuards.join(', ') },
          suggest: [{ messageId: 'addGuards', fix: () => null }],
        });
      },
    };
  },
});
