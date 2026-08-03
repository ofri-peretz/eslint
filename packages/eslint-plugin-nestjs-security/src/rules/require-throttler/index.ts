/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-throttler
 * Requires @Throttle or ThrottlerGuard for rate limiting
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://docs.nestjs.com/security/rate-limiting
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
  enclosingClass,
  expressionName,
  findDecorator,
  hasDecorator,
  collectImportOrigins,
  isAccessControlDecorator,
  HTTP_METHOD_DECORATORS,
  isControllerClass,
  isTestFile,
  memberName,
  type ClassNode,
} from '../../utils/nest-ast';

type MessageIds = 'missingThrottler' | 'addThrottler';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Skip checking specific routes. Default: [] */
  skipRoutes?: string[];
  /** Skip rule if ThrottlerModule is configured globally in AppModule. Default: false */
  assumeGlobalThrottler?: boolean;
  /**
   * Only require throttling on credential/abuse-prone routes (login, signup,
   * password reset, OTP, ...). Default: true.
   *
   * Set false to require it on every route — accurate to CWE-770 in the
   * abstract, but on real codebases that reports every endpoint, because rate
   * limiting is normally applied globally via ThrottlerModule + APP_GUARD
   * rather than per route.
   */
  onlySensitiveRoutes?: boolean;
}

type RuleOptions = [Options?];

/** No per-rule extra names here; the module origin decides. */
const EMPTY_NAMES: ReadonlySet<string> = new Set();

// Throttle-related decorators
const THROTTLE_DECORATORS = new Set(['Throttle', 'SkipThrottle']);

/**
 * Route/handler name tokens that mark a credential or abuse-prone endpoint.
 * These are where missing rate limiting is exploitable (brute force, user
 * enumeration, OTP flooding, mail bombing) rather than merely absent.
 */
const SENSITIVE_ROUTE_TOKENS = [
  'login',
  'signin',
  'sign-in',
  'logout',
  'signup',
  'sign-up',
  'register',
  'registration',
  'password',
  'passwd',
  'forgot',
  'reset',
  'recover',
  'confirm',
  'verify',
  'verification',
  'otp',
  'mfa',
  '2fa',
  'totp',
  'token',
  'refresh',
  'resend',
  'invite',
  'invitation',
  'auth',
  'session',
];

// Deliberately NOT in the list: 'search', 'upload', 'email', 'sms'. Those are
// capacity and cost concerns, not credential abuse — and in the corpus they are
// almost always authenticated endpoints, where brute force is not the threat.
// immich's `@Post('smart')` search sat behind `@Authenticated` and was reported
// purely because "search" was on the list.

/** Whether a route path or handler name looks credential/abuse-prone. */
function isSensitiveRoute(candidates: readonly string[]): boolean {
  return candidates.some((c) => {
    const lower = c.toLowerCase();
    return SENSITIVE_ROUTE_TOKENS.some((t) => lower.includes(t));
  });
}

export const requireThrottler = createRule<RuleOptions, MessageIds>({
  name: 'require-throttler',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-throttler.md',
      description:
        'Requires ThrottlerGuard or @Throttle decorator for rate limiting',
      cwe: 'CWE-770',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingThrottler: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Rate Limiting',
        cwe: 'CWE-770',
        cvss: 7.5,
        description:
          'Controller {{name}} lacks rate limiting protection (Throttler)',
        severity: 'HIGH',
        fix: 'Add @UseGuards(ThrottlerGuard) or configure global ThrottlerModule',
        documentationLink: 'https://docs.nestjs.com/security/rate-limiting',
      }),
      addThrottler: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Rate Limiting',
        description:
          'Configure ThrottlerModule to protect against DoS/brute-force attacks',
        severity: 'LOW',
        fix: 'npm i @nestjs/throttler && ThrottlerModule.forRoot({ ttl: 60, limit: 10 })',
        documentationLink: 'https://docs.nestjs.com/security/rate-limiting',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          skipRoutes: { type: 'array', items: { type: 'string' }, default: [] },
          assumeGlobalThrottler: { type: 'boolean', default: false },
          onlySensitiveRoutes: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { allowInTests: true, skipRoutes: [], assumeGlobalThrottler: false },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = true,
      assumeGlobalThrottler = false,
      skipRoutes = [],
      onlySensitiveRoutes = true,
    } = options as Options;

    // Skip entirely if global ThrottlerModule is assumed (configured in AppModule)
    if (assumeGlobalThrottler) {
      return {};
    }

    if (allowInTests && isTestFile(context.filename)) {
      return {};
    }

    const origins = collectImportOrigins(context.sourceCode.ast);
    const skipped = new Set(skipRoutes);

    /** Whether @UseGuards(...) installs a ThrottlerGuard. */
    function hasThrottlerGuardDecorator(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      const dec = findDecorator(decorators, 'UseGuards');
      const call = dec ? decoratorCall(dec) : null;
      if (!call) return false;
      return call.arguments.some(
        (arg) => expressionName(arg) === 'ThrottlerGuard',
      );
    }

    /** Whether @Throttle or @SkipThrottle is applied. */
    function hasThrottleDecorator(
      decorators: TSESTree.Decorator[] | undefined,
    ): boolean {
      return hasDecorator(decorators, THROTTLE_DECORATORS);
    }

    /** Route paths declared by an HTTP-method decorator, without slashes. */
    function routePaths(routeDecorator: TSESTree.Decorator): string[] {
      const call = decoratorCall(routeDecorator);
      if (!call) return [];
      return call.arguments
        .filter(
          (arg): arg is TSESTree.StringLiteral =>
            arg.type === AST_NODE_TYPES.Literal &&
            typeof arg.value === 'string',
        )
        .map((arg) => arg.value.replace(/^\/+|\/+$/g, ''));
    }

    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        // A MethodDefinition is always a ClassBody child, so this is non-null.
        const cls = enclosingClass(node) as ClassNode;
        if (!isControllerClass(cls)) return;

        const routeDecorator = findDecorator(
          node.decorators,
          HTTP_METHOD_DECORATORS,
        );
        if (!routeDecorator) return;

        // Skip if class or method has throttler
        if (
          hasThrottleDecorator(cls.decorators) ||
          hasThrottlerGuardDecorator(cls.decorators) ||
          hasThrottleDecorator(node.decorators) ||
          hasThrottlerGuardDecorator(node.decorators)
        ) {
          return;
        }

        // A route behind authentication is not a brute-force target: the
        // attacker needs credentials to reach it at all. Rate limiting there is
        // a capacity decision, not CWE-770 credential abuse. This makes the rule
        // the exact complement of require-guards, which exempts the public
        // authentication entry points that this rule protects.
        if (
          onlySensitiveRoutes &&
          ((node.decorators ?? []).some((d) =>
            isAccessControlDecorator(d, origins, EMPTY_NAMES),
          ) ||
            (cls.decorators ?? []).some((d) =>
              isAccessControlDecorator(d, origins, EMPTY_NAMES),
            ))
        ) {
          return;
        }

        const methodName = memberName(node) ?? '<anonymous>';
        const paths = routePaths(routeDecorator);

        // `skipRoutes` matches either the handler name or a declared route path.
        if (skipped.has(methodName) || paths.some((p) => skipped.has(p))) {
          return;
        }

        // By default only credential/abuse-prone routes must declare throttling;
        // everything else is normally covered by a global ThrottlerModule.
        if (onlySensitiveRoutes && !isSensitiveRoute([methodName, ...paths])) {
          return;
        }

        context.report({
          node,
          messageId: 'missingThrottler',
          data: { name: methodName },
          suggest: [{ messageId: 'addThrottler', fix: () => null }],
        });
      },
    };
  },
});
