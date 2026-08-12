/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-guards
 * Requires @UseGuards decorator on controllers or route handlers
 * CWE-306: Missing Authentication for Critical Function
 * CWE-862: Missing Authorization (when a required guard is absent but others run)
 *
 * @see https://cwe.mitre.org/data/definitions/306.html
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
  routeMethodName,
} from '../../utils/nest-ast';
import { tokenize } from '../../utils/sensitive-names';
import { getProjectContext } from '../../utils/project-context';
import { fileUsesNestjs } from '../../utils/nestjs-evidence';

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
  /**
   * Scan the project for a guard registered app-wide via `APP_GUARD` or `app.useGlobalGuards()`,
   * and stay quiet when one is found. Default: true.
   *
   * The registration lives in a different file from the route, so a
   * single-file rule cannot see it — this is the cross-file scan that
   * makes the difference between silence and reporting a correctly
   * configured application.
   */
  detectGlobalGuards?: boolean;
}

type RuleOptions = [Options?];

// Decorators that bypass guard requirements
const PUBLIC_DECORATORS = new Set([
  'Public',
  'IsPublic',
  'SkipAuth',
  'AllowAnonymous',
  'Anonymous',
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
/**
 * Name tokens that denote an infrastructure probe.
 *
 * Kept separate from DEFAULT_PUBLIC_ROUTES because these are matched against
 * the *handler name* rather than a path segment, and only at a name boundary.
 */
const PROBE_TERMS: ReadonlySet<string> = new Set([
  'health',
  'healthz',
  'healthcheck',
  'liveness',
  'readiness',
  'live',
  'ready',
  'ping',
  'status',
]);

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
  // An activation link is the same concept as `verify` and `confirm`, which
  // are already here: a one-time URL mailed to someone who is by definition
  // not logged in yet.
  'activate',
  'activation',
  'activate-account',
  // Standards-defined public URLs. A crawler fetches these unauthenticated by
  // definition, so demanding a guard is demanding the endpoint stop working.
  // They are here on the same footing as `health` and `ping`: well-known
  // conventions rather than one application's naming.
  'sitemap',
  'sitemap.xml',
  'robots',
  'robots.txt',
  '.well-known',
];

/**
 * Password recovery, whatever order the words come in.
 *
 * The corpus spells it `reset-password`, `password-reset`,
 * `request-password-reset`, `forgotPassword` and `resetPassword`. Enumerating
 * those is how a name list grows to eight entries and then to eight lists;
 * matching the combination instead costs one predicate and does not grow.
 */
const RECOVERY_VERB: ReadonlySet<string> = new Set([
  'reset',
  'forgot',
  'forgotten',
  'request',
  'recover',
  'recovery',
]);

function isPasswordRecovery(tokens: readonly string[]): boolean {
  return (
    tokens.includes('password') && tokens.some((t) => RECOVERY_VERB.has(t))
  );
}

/** Verb suffixes used to tell two handlers on one path apart. */
const HTTP_VERB_SUFFIX: ReadonlySet<string> = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

/**
 * Names that denote a credential — a header, an environment variable, or a
 * config key.
 *
 * A webhook receiver authenticates by comparing a shared secret or an HMAC
 * signature inside the handler — the mechanism Stripe, GitHub and Stigg all
 * document. There is no guard because there is no NestJS-side identity to
 * establish, and demanding one is wrong. Real instance:
 * `amplication/.../subscription.controller.ts:20` reads
 * `@Headers("stigg-webhooks-secret")` and throws on a mismatch.
 *
 * The name is what carries the intent, and it is the only thing separating a
 * credential check from an environment check. `process.env.CRON_SECRET !== key`
 * authenticates; `process.env.NODE_ENV !== 'production'` is a feature flag, and
 * treating the two alike would let any handler switch this rule off by
 * inspecting its environment.
 */
const CREDENTIAL_NAME =
  /secret|signature|token|authorization|api[-_]?key|hmac|hub-signature|password|credential/i;

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
      // CWE-306 (Base, mapping Allowed), not CWE-284. CWE-284 is a Pillar and
      // MITRE marks it Discouraged for real findings — "often misused in
      // low-information vulnerability reports", which is exactly how a
      // security linter loses a reader's trust.
      cwe: 'CWE-306',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingGuards: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authorization Guards',
        cwe: 'CWE-306',
        // AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N = 7.5, and an unguarded route
        // that only *reads* scores the same 7.5 via C:H/I:N/A:N — so 7.5 holds
        // whichever way the handler goes. 9.8 needs C:H **and** I:H **and**
        // A:H at once, which one missing guard does not produce; claiming it
        // on every finding leaves no room to say when something is worse.
        cvss: 7.5,
        description:
          'Controller/route handler {{name}} lacks @UseGuards for access control',
        severity: 'HIGH',
        fix: 'Add @UseGuards(AuthGuard): @UseGuards(AuthGuard) before the handler',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      emptyGuards: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Empty Guard List',
        cwe: 'CWE-306',
        cvss: 7.5,
        description:
          '@UseGuards() on {{name}} declares no guard, so it enforces nothing',
        severity: 'HIGH',
        fix: 'Pass a guard class: @UseGuards(AuthGuard)',
        documentationLink: 'https://docs.nestjs.com/guards',
      }),
      missingRequiredGuard: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Required Guard',
        // A different weakness from the two above: the route *is* guarded, so
        // authentication is present and only a required policy guard is
        // absent. That is missing authorization (CWE-862), and the attacker
        // needs privileges to reach it — PR:L rather than PR:N.
        cwe: 'CWE-862',
        // AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N = 6.5
        cvss: 6.5,
        description:
          'Route handler {{name}} is guarded, but none of the required guards ({{required}}) is applied',
        severity: 'MEDIUM',
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
          detectGlobalGuards: {
            type: 'boolean',
            default: true,
            description: 'Look for globally registered guards before reporting',
          },
          requiredGuards: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Guard names that must be present',
          },
          allowPublicDecorator: {
            type: 'boolean',
            default: true,
            description:
              'Treat a `@Public()` decorator as intentionally unguarded',
          },
          assumeGlobalGuards: {
            type: 'boolean',
            default: false,
            description: 'Assume global guards exist even if none are found',
          },
          authDecorators: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra decorator names that count as authentication',
          },
          publicRoutes: {
            type: 'array',
            items: { type: 'string' },
            // No `default` on purpose. ESLint validates options with Ajv in
            // useDefaults mode, so a default here is written into the options
            // object whenever a config supplies one at all — `['error', {}]`
            // would arrive as `publicRoutes: []`, defeating the `??` below and
            // wiping out every built-in public route. Leaving it undefined is
            // what lets an omitted key mean "use the defaults" while an
            // explicit `[]` still means "no public routes".
            description: 'Route paths that may be left unguarded',
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
    // Registering no visitors is both the gate and the cheap path: a file
    // that does not use this SDK does no work at all.
    if (!fileUsesNestjs(context.sourceCode.ast)) return {};

    const {
      allowInTests = true,
      allowPublicDecorator = true,
      assumeGlobalGuards = false,
      detectGlobalGuards = true,
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

    // The registration lives in another file, so this is the only way a
    // single-file rule can know it exists. Without it the rule reports every
    // route of a correctly-configured application.
    const project = detectGlobalGuards ? getProjectContext(context) : null;
    // A global registration proves *a* guard runs, not that it is the one the
    // config demands. With `requiredGuards: ['RolesGuard']`, a global AuthGuard
    // would otherwise clear every route of a requirement it does not satisfy —
    // and the scan reads module text, so it cannot tell which class it found.
    if (project?.hasGlobalAuthGuard && requiredGuards.length === 0) {
      return {};
    }

    // "You forgot a guard here" only means something where guards are the
    // mechanism. A project with no authentication at all has no guard to
    // forget, and reporting each of its routes teaches the reader to disable
    // the rule. 38 of 94 corpus1 findings were NestJS's own tutorial samples.
    if (project !== null && !project.hasAuthMechanism) {
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
      const rawHandler = memberName(node) ?? '';
      const handler = rawHandler.toLowerCase();
      if (publicSet.has(handler)) return true;

      // An auth entry point is rarely named exactly `login`. It is qualified by
      // its provider or transport — `auth0Login`, `githubCallback`,
      // `awsMarketplaceCallback`, `auth0Logout` — and exact matching reported
      // every one of them. Match the trailing token, and the trailing pair
      // joined, so hyphenated terms (`reset-password`) also land.
      //
      // Only the tail counts: `getLoginHistory` reads as a resource listing and
      // stays in scope, while `<qualifier>Login` reads as the entry point
      // itself. Unlike the probe check this is not restricted to GET — a login
      // or a callback is normally a POST.
      // A trailing HTTP verb disambiguates two handlers on one path
      // (`auth0Callback` / `auth0CallbackPost`); it says nothing about what the
      // route is, so it must not hide the term that does.
      const parts = tokenize(rawHandler).filter(
        (token, index, all) =>
          index < all.length - 1 || !HTTP_VERB_SUFFIX.has(token),
      );
      const last = parts[parts.length - 1];
      const pair = parts.slice(-2).join('-');
      if ((last !== undefined && publicSet.has(last)) || publicSet.has(pair)) {
        return true;
      }
      if (isPasswordRecovery(parts)) return true;

      // A liveness/readiness probe is often only identifiable by its handler
      // name: `@Controller('')` + `@Get()` + `healthCheck()` has no path
      // segment to match, and exact-name matching reported a void-returning
      // probe at CRITICAL. Tokenise the name and accept a probe term at either
      // end — `healthCheck`, `getHealth`, `livenessProbe` all qualify.
      //
      // Bounded deliberately: only the first or last token counts, so
      // `deleteHealthRecord` stays in scope, and only on a read, because a
      // write is never a probe whatever it is called.
      if (routeMethodName(node) === 'Get') {
        // Tokenise the ORIGINAL name: `handler` is already lower-cased, which
        // destroys the camelCase boundaries tokenize() splits on.
        const parts = tokenize(rawHandler);
        const ends = [parts[0], parts[parts.length - 1]].filter(Boolean);
        if (ends.some((t) => PROBE_TERMS.has(t))) return true;
      }

      // Both decorators are guaranteed present: the caller already established
      // this is a route handler on a @Controller class.
      const controllerPath = pathSegments(
        findDecorator(cls.decorators, 'Controller') as TSESTree.Decorator,
      );
      const routePath = pathSegments(
        findDecorator(
          node.decorators,
          HTTP_METHOD_DECORATORS,
        ) as TSESTree.Decorator,
      );
      const segments = [...controllerPath, ...routePath];

      // `@Controller()` + `@Get()` + a handler taking nothing is the route
      // `GET /` — the controller `nest new` writes, kept and never guarded.
      // It names no resource, accepts no input and identifies nothing to
      // authorize. 15 of 32 remaining corpus1 findings were this exact shape,
      // nine of them the same generated file across one monorepo's services.
      //
      // Every clause is load-bearing: a path argument, a parameter or a
      // non-GET method all take it out of this exemption, so a real collection
      // read cannot slip through by being mounted at the root.
      //
      // The test is *no argument*, not *no resolvable segment*. Those are not
      // the same thing: `@Controller(ADMIN_PREFIX)` yields no segments because
      // the path is a constant this rule cannot read, and treating unreadable
      // as absent would exempt every route behind a constant prefix.
      if (
        hasNoPathArgument(
          findDecorator(cls.decorators, 'Controller') as TSESTree.Decorator,
        ) &&
        hasNoPathArgument(
          findDecorator(
            node.decorators,
            HTTP_METHOD_DECORATORS,
          ) as TSESTree.Decorator,
        ) &&
        node.value.params.length === 0 &&
        routeMethodName(node) === 'Get'
      ) {
        return true;
      }
      if (segments.some((seg) => publicSet.has(seg))) return true;

      // `@Post('reset/password')` splits into two segments, and the term the
      // list carries is the hyphenated `reset-password`. Join adjacent
      // segments so the path spelling and the option spelling can meet.
      for (let i = 0; i + 1 < segments.length; i++) {
        if (publicSet.has(`${segments[i]}-${segments[i + 1]}`)) return true;
      }
      // …and the path can spell recovery as one hyphenated segment
      // (`request-password-reset`) or as several.
      return isPasswordRecovery(segments.flatMap((seg) => seg.split('-')));
    }

    /**
     * Whether an authentication middleware covers this controller.
     *
     * `configure(consumer).apply(AuthMiddleware).forRoutes(...)` authenticates
     * without a single `@UseGuards`, and the registration is in the module
     * file. The match is at controller granularity — which routes of the
     * controller the middleware covers is decided by path patterns this rule
     * cannot line up statically, so it abstains for the controller rather than
     * accusing routes it cannot clear.
     */
    function middlewareProtected(
      node: TSESTree.MethodDefinition,
      cls: ClassNode,
    ): boolean {
      const targets = project?.authMiddlewareTargets;
      if (targets === undefined || targets.size === 0) return false;
      if (cls.id?.name !== undefined && targets.has(cls.id.name)) return true;
      // The prefix can live on either decorator. RealWorld's UserController is
      // `@Controller()` with `@Get('user')` on the handler, so keying only on
      // the controller prefix left its middleware-protected routes reported.
      const prefix =
        pathSegments(
          findDecorator(cls.decorators, 'Controller') as TSESTree.Decorator,
        )[0] ??
        pathSegments(
          findDecorator(
            node.decorators,
            HTTP_METHOD_DECORATORS,
          ) as TSESTree.Decorator,
        )[0];
      return prefix !== undefined && targets.has(prefix);
    }

    /**
     * Whether a route decorator carries no path at all — `@Controller` bare,
     * `@Controller()` or `@Get()`. Both decorators are guaranteed present: the
     * caller already established this is a route handler on a controller.
     */
    function hasNoPathArgument(decorator: TSESTree.Decorator): boolean {
      const call = decoratorCall(decorator);
      if (call === null || call.arguments.length === 0) return true;
      // `@Controller('')` and `@Get('')` mean exactly what the bare forms mean.
      // Two corpus2 boilerplates spell the scaffold that way, and counting an
      // empty string as a path left them reported.
      return call.arguments.every(
        (arg) =>
          arg.type === AST_NODE_TYPES.Literal &&
          typeof arg.value === 'string' &&
          arg.value.replace(/\//g, '') === '',
      );
    }

    /**
     * Whether the handler takes a credential header as a parameter.
     *
     * Presence of the parameter is the evidence. Proving the value is then
     * *compared* would mean following it through the body, and a handler that
     * asks for `@Headers('x-hub-signature')` and ignores it is not a shape that
     * occurs — whereas reporting every signature-verified webhook does.
     */
    function verifiesCredentialHeader(
      node: TSESTree.MethodDefinition,
    ): boolean {
      return node.value.params.some((param) =>
        // Every parameter node in the union carries `decorators`; a route
        // handler is never a constructor, so the parameter-property arm that
        // would make it optional cannot occur here.
        param.decorators.some((decorator) => {
          const call = decoratorCall(decorator);
          if (call === null || expressionName(call.callee) !== 'Headers') {
            return false;
          }
          return call.arguments.some(
            (arg) =>
              arg.type === AST_NODE_TYPES.Literal &&
              typeof arg.value === 'string' &&
              CREDENTIAL_NAME.test(arg.value),
          );
        }),
      );
    }

    /**
     * Whether the handler compares something against a configured secret.
     *
     * The sibling of `verifiesCredentialHeader`, one step further in: instead of
     * declaring the credential as a `@Headers()` parameter, these handlers take
     * it as a query or route parameter and check it against the environment
     * themselves.
     *
     *     if (this.configService.get<string>('FEATURE_TOKEN') !== token) {
     *       this.logger.error('InvalidToken, process aborted');
     *       return false;
     *     }
     *
     * That is amplication's `user.controller.ts:19`, reported as an unguarded
     * route while it authenticates on its first statement. A secret read from
     * `process.env` or a config service, on either side of an equality
     * comparison, is not a value an unauthenticated caller can supply.
     *
     * Narrow on purpose. Only equality against a *secret source* counts —
     * `if (user.role === 'admin')` is authorization on already-trusted data and
     * says nothing about whether the caller was authenticated. Requiring the
     * comparison, rather than a bare `process.env` read, keeps a handler that
     * merely logs `process.env.NODE_ENV` from silencing the rule.
     */
    function comparesAgainstConfiguredSecret(
      node: TSESTree.MethodDefinition,
    ): boolean {
      // Non-null here for the same reason as elsewhere in this file: TypeScript
      // forbids decorators on an overload or abstract signature, so a body-less
      // method is never a route handler.
      const body = node.value.body as TSESTree.BlockStatement;

      /**
       * `process.env.SOME_SECRET`, or `config.get('SOME_SECRET')`.
       *
       * The *name* has to look like a credential, exactly as
       * `verifiesCredentialHeader` requires of the header it reads. Without
       * that, `process.env.NODE_ENV !== 'production'` would silence this rule
       * as effectively as a token check, and any handler could switch its own
       * access control off by looking at its environment.
       */
      const isSecretSource = (expr: TSESTree.Node): boolean => {
        if (expr.type === AST_NODE_TYPES.MemberExpression) {
          return (
            expressionName(expr.object) === 'env' &&
            CREDENTIAL_NAME.test(expressionName(expr))
          );
        }
        if (expr.type !== AST_NODE_TYPES.CallExpression) return false;
        if (expressionName(expr.callee) !== 'get') return false;
        if (expr.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
        // The receiver is usually `this.configService`, a member expression
        // rather than a bare identifier, so match on its property name.
        if (!/config/i.test(expressionName(expr.callee.object))) return false;
        return expr.arguments.some(
          (arg) =>
            arg.type === AST_NODE_TYPES.Literal &&
            typeof arg.value === 'string' &&
            CREDENTIAL_NAME.test(arg.value),
        );
      };

      let found = false;
      const visit = (current: TSESTree.Node): void => {
        if (found) return;
        // Authentication is something the handler does, not something a
        // callback it passes along happens to contain. A comparison inside
        // `.filter(item => item.secret !== process.env.FILTER_TOKEN)` is data
        // processing, and letting it count would hand every handler an easy
        // way to look authenticated.
        if (
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          return;
        }
        if (
          current.type === AST_NODE_TYPES.BinaryExpression &&
          ['===', '!==', '==', '!='].includes(current.operator) &&
          (isSecretSource(current.left) || isSecretSource(current.right))
        ) {
          found = true;
          return;
        }
        for (const key of Object.keys(current) as (keyof TSESTree.Node)[]) {
          if (key === 'parent') continue;
          const value = current[key] as unknown;
          if (Array.isArray(value)) {
            for (const child of value) {
              if (child && typeof child === 'object' && 'type' in child) {
                visit(child as TSESTree.Node);
              }
            }
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };
      visit(body);
      return found;
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
        if (middlewareProtected(node, cls)) return;
        if (verifiesCredentialHeader(node)) return;
        if (comparesAgainstConfiguredSecret(node)) return;

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
