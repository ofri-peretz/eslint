/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-rate-limiting
 *
 * Detects an Express app that accepts a secret to be checked — login, token,
 * password-reset, OTP, invite-redemption — on a state-changing route with no
 * rate limiter anywhere in the file.
 *
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * ## Why the endpoint and not the app
 *
 * "An Express app exists and `rateLimit` was not called" matches a *shape*: it
 * fires on every app ever written, including a static-file server with nothing
 * to throttle. The exploitable form of CWE-770 here is the guess-and-retry
 * loop against a credential check, which is why the surface — a state-changing
 * route whose path names a secret — is the precondition, and the route is the
 * reported node.
 *
 * A read-only or purely static app is *not* reported. That is a deliberate
 * scope choice: throttling a GET is capacity engineering, and a linter cannot
 * tell an expensive read from a cheap one.
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  nodeReleasesBinding,
  RELEASE_SELECTOR,
} from '../../utils/app-composition';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary `express` is the package name on npm and the HTTP method names
 * are the router methods Express defines. Both are published; neither is a
 * consumer's choice.
 *
 * @see https://expressjs.com/en/api.html#app.METHOD
 */
type MessageIds = 'missingRateLimiting';

export interface Options {
  /** Allow missing rate limiting in test files. Default: false */
  allowInTests?: boolean;

  /** Alternative rate-limiting middleware names. Default: [] */
  alternativeMiddleware?: string[];

  /**
   * Skip rule if rate limiting is provided elsewhere (e.g., AWS API Gateway, Cloudflare, nginx).
   * Default: false
   */
  assumeRateLimiting?: boolean;
}

type RuleOptions = [Options?];

/**
 * Route methods that change state. A rate limiter on a read-only surface is an
 * availability-engineering choice; on a state-changing one it is the control
 * that stops the guess-and-retry loop.
 */
const STATE_CHANGING_METHODS: ReadonlySet<string> = new Set([
  'post',
  'put',
  'patch',
  'delete',
]);

/** Receivers that are an Express application/router in practice. */
const APP_RECEIVER = /^(app|router|express|api|apiRouter|routes)$/i;

/**
 * Route paths where the request carries a *secret to be checked* — the surface
 * CWE-770's exploitable form (brute force, OWASP "Blocking Brute Force
 * Attacks", the link this rule already ships) actually lives on.
 */
const CREDENTIAL_PATH =
  /(^|[^a-z0-9])(login|log-in|signin|sign-in|signup|sign-up|register|authenticate|auth|authorize|token|password|passwd|credential|otp|mfa|2fa|totp|verify|verification|confirm|reset|forgot|recover|unlock|challenge|session|invite|redeem|coupon|promo)([^a-z0-9]|$)/i;

const RATE_LIMIT_PACKAGES = [
  'ratelimit',
  'rateLimit',
  'rateLimiter',
  'limiter',
  'expressRateLimit',
  'slowDown',
  'expressBrute',
];

/**
 * Check if a node is a rate-limiting middleware usage
 */
function isRateLimitMiddleware(
  node: TSESTree.CallExpression,
  alternatives: string[],
): boolean {
  const allPatterns = [...RATE_LIMIT_PACKAGES, ...alternatives];

  for (const arg of node.arguments) {
    // rateLimit() or limiter()
    if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
      const calleeName = arg.callee.name.toLowerCase();
      if (allPatterns.some((p) => calleeName.includes(p.toLowerCase()))) {
        return true;
      }
    }

    // rateLimit identifier without call
    if (arg.type === 'Identifier') {
      if (
        allPatterns.some((p) =>
          arg.name.toLowerCase().includes(p.toLowerCase()),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export const requireRateLimiting = createRule<RuleOptions, MessageIds>({
  name: 'require-rate-limiting',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-rate-limiting.md',
      description:
        'Require rate-limiting middleware in Express.js applications',
      cwe: 'CWE-770',
      cvss: 7.5,
    },
    messages: {
      missingRateLimiting: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unthrottled Credential Endpoint',
        cwe: 'CWE-770',
        description:
          '{{method}} {{path}} accepts a secret to be checked and this app mounts no rate limiter. An attacker can run the guess-and-retry loop at full speed.',
        severity: 'HIGH',
        fix: 'Add rate limiting: npm install express-rate-limit; app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))',
        documentationLink: 'https://www.npmjs.com/package/express-rate-limit',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          alternativeMiddleware: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra middleware names that count as rate limiting',
          },
          assumeRateLimiting: {
            type: 'boolean',
            default: false,
            description:
              'Skip if rate limiting is provided by infrastructure (API Gateway, nginx, etc.)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      alternativeMiddleware: [],
      assumeRateLimiting: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const {
      allowInTests = false,
      alternativeMiddleware = [],
      assumeRateLimiting = false,
    } = options as Options;

    // Skip entirely if rate limiting is assumed (provided by infrastructure)
    if (assumeRateLimiting) {
      return {};
    }

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    if (isTestFile) {
      return {};
    }

    let hasExpressApp = false;
    let hasRateLimiting = false;
    /**
     * The first credential-accepting route in the file.
     *
     * Rule partition — see the matching note in require-helmet. This rule used
     * to report the `express()` node, which is the *same character* that rule
     * reports: on the 8-repo corpus all six findings of each landed on the
     * identical file:line:column. They are now disjoint by construction —
     * require-helmet owns the app-creation site, this rule owns the endpoint.
     *
     * Reporting the route is also where the fix goes: a limiter is mounted for
     * the login surface, and the endpoint is what an attacker steers. Only the
     * first is reported, because the fix (`app.use(rateLimit(…))`) is one edit
     * for the whole app.
     */
    let credentialRoute: {
      node: TSESTree.Node;
      method: string;
      path: string;
    } | null = null;
    /** The binding `express()` was assigned to, so we can see where it travels. */
    let appBinding: string | null = null;
    /**
     * The app was handed to another function, so the middleware stack is
     * assembled somewhere this rule cannot see — see the same guard in
     * require-helmet. Measured on ToniR7/express-typescript-starter, which
     * registers its rate limiter in `utils/appInitialization.ts` and was
     * reported anyway.
     */
    let appEscapes = false;

    return {
      // `module.exports = app`, `export default app`, `return app`.
      [RELEASE_SELECTOR](node: TSESTree.Node) {
        if (appBinding !== null && nodeReleasesBinding(node, appBinding)) {
          appEscapes = true;
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // `setAppConfigurations(app)` — the app leaves this file.
        if (appBinding !== null && nodeReleasesBinding(node, appBinding)) {
          appEscapes = true;
        }

        // Check for express() app creation
        if (callee.type === 'Identifier' && callee.name === 'express') {
          hasExpressApp = true;
          if (
            node.parent?.type === 'VariableDeclarator' &&
            node.parent.id.type === 'Identifier'
          ) {
            appBinding = node.parent.id.name;
          }
          return;
        }

        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier'
        ) {
          return;
        }
        const method = callee.property.name.toLowerCase();

        // A limiter anywhere in the file — `app.use(rateLimit())` or mounted
        // on a single route — covers the surface this rule judges.
        if (isRateLimitMiddleware(node, alternativeMiddleware)) {
          hasRateLimiting = true;
          return;
        }

        if (!STATE_CHANGING_METHODS.has(method)) return;
        if (
          callee.object.type !== 'Identifier' ||
          !APP_RECEIVER.test(callee.object.name)
        ) {
          return;
        }
        const [pathArg, ...rest] = node.arguments;
        if (
          rest.length === 0 ||
          pathArg?.type !== 'Literal' ||
          typeof pathArg.value !== 'string'
        ) {
          return;
        }
        if (!CREDENTIAL_PATH.test(pathArg.value)) return;
        credentialRoute ??= {
          node,
          method: method.toUpperCase(),
          path: pathArg.value,
        };
      },

      'Program:exit'() {
        if (
          hasExpressApp &&
          !hasRateLimiting &&
          !appEscapes &&
          credentialRoute
        ) {
          context.report({
            node: credentialRoute.node,
            messageId: 'missingRateLimiting',
            data: {
              method: credentialRoute.method,
              path: credentialRoute.path,
            },
          });
        }
      },
    };
  },
});
