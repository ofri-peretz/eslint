/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-permissive-cors
 * Flags CORS configured to accept any origin.
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * Three shapes, all of which accept every origin:
 *
 * ```ts
 * app.enableCors();                    // no options → origin defaults to '*'
 * app.enableCors({ origin: '*' });     // explicit wildcard
 * app.enableCors({ origin: true });    // reflects whatever Origin was sent
 * ```
 *
 * `origin: true` is the one worth understanding. It is not "enabled" — it echoes
 * the request's own `Origin` header back in `Access-Control-Allow-Origin`, so
 * every site passes. Unlike `'*'`, it also remains valid alongside
 * `credentials: true`, and browsers *will* send cookies on those requests. That
 * combination lets any page a victim visits read authenticated responses.
 *
 * Deliberately NOT reported: an origin this rule cannot evaluate statically —
 * `enableCors({ origin: config.get('cors') })`, a variable imported from another
 * module, a function callback. Those are the shapes a correctly-configured app
 * uses, and guessing at them is how a security rule earns a reputation for noise.
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://docs.nestjs.com/security/cors
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { expressionName, objectProperties } from '../../utils/nest-ast';

/**
 * Identifiers and members that mean "which environment are we in".
 *
 * Narrower than "any condition" on purpose. A permissive origin fenced behind
 * a development check cannot reach production, and reporting it at the same
 * CVSS 8.1 as an unconditional one is what makes a security rule read as
 * noise. But a condition that is *not* about the environment proves nothing —
 * `if (req.path.startsWith('/public'))` still ships to real users.
 */
const ENV_HINT =
  /\b(NODE_ENV|APP_ENV|ENVIRONMENT|isDev|isDevelopment|isLocal|isTest|isProd|isProduction|devMode|development|production)\b/;

/**
 * …but a branch about the environment is only an excuse when it restricts the
 * call to a *non-production* environment.
 *
 * `if (process.env.NODE_ENV === 'production') app.enableCors({ origin: '*' })`
 * mentions the environment and is the worst case there is. Direction has to be
 * read, not just the presence of an environment word.
 *
 * Two shapes count as development-scoped, and nothing else does:
 *   - the condition names a development-ish environment (`development`,
 *     `test`, `local`, `staging`, `isDev`, `devMode`), or
 *   - it *negates* a production one (`NODE_ENV !== 'production'`, `!isProd`).
 */
const DEV_ENVIRONMENT =
  /\b(isDev|isDevelopment|isLocal|isTest|devMode|dev|development|test|local|staging)\b/i;
const PROD_ENVIRONMENT = /\b(isProd|isProduction|production|prod)\b/i;
const NEGATION = /!==|!=|\bnot\b|^\s*!/;

function isDevelopmentScoped(text: string): boolean {
  const negated = NEGATION.test(text);
  if (PROD_ENVIRONMENT.test(text)) {
    // `NODE_ENV !== 'production'` gates development; `=== 'production'` does
    // the opposite and must keep reporting.
    return negated;
  }
  if (DEV_ENVIRONMENT.test(text)) {
    // `NODE_ENV !== 'development'` is a production gate wearing a dev word.
    return !negated;
  }
  return false;
}

type MessageIds = 'wildcardOrigin' | 'reflectedOrigin' | 'defaultOrigin';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

const TEST_FILE = /\.(?:spec|test|e2e-spec)\.[cm]?[jt]sx?$/;

/** Resolve a `const x = { … }` declared in this same file, or null. */
function resolveLocalObject(
  scope: TSESLint.Scope.Scope | null,
  name: string,
): TSESTree.ObjectExpression | null {
  for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
    const variable = s.variables.find((v) => v.name === name);
    if (!variable) continue;
    // Reassignment defeats this analysis: the value at the call site may not be
    // the value at the declaration. `let o = { origin: '*' }; o = safe;` would
    // otherwise report on a binding that is safe by the time it is used. Only
    // a binding written exactly once — its initialiser — is safe to read.
    if (variable.references.filter((ref) => ref.isWrite()).length > 1)
      return null;
    for (const def of variable.defs) {
      if (def.node.type !== AST_NODE_TYPES.VariableDeclarator) continue;
      const init = def.node.init;
      if (init && init.type === AST_NODE_TYPES.ObjectExpression) return init;
    }
    return null;
  }
  return null;
}

/** The `origin` property of a CORS options object, or undefined when absent. */
function findOriginProperty(
  options: TSESTree.ObjectExpression,
): TSESTree.Property | undefined {
  for (const prop of options.properties) {
    if (prop.type !== AST_NODE_TYPES.Property) continue;
    // A computed key is a variable reference, not a name: in `{ [origin]: '*' }`
    // the key node is an Identifier called `origin` but says nothing about which
    // property is being set.
    if (prop.computed) continue;
    const key =
      prop.key.type === AST_NODE_TYPES.Identifier
        ? prop.key.name
        : prop.key.type === AST_NODE_TYPES.Literal &&
            typeof prop.key.value === 'string'
          ? prop.key.value
          : null;
    if (key === 'origin') return prop;
  }
  return undefined;
}

/** True when the object spreads anything — `origin` may be supplied from there. */
function hasSpread(object: TSESTree.ObjectExpression): boolean {
  return object.properties.some(
    (prop) => prop.type === AST_NODE_TYPES.SpreadElement,
  );
}

export const noPermissiveCors = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-permissive-cors.md',
      description: 'Disallows CORS configured to accept any origin',
      cwe: 'CWE-942',
      cvss: 7.5,
    },
    messages: {
      defaultOrigin: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS',
        cwe: 'CWE-942',
        owasp: 'A05:2021',
        cvss: 5.3,
        description:
          'enableCors() with no options defaults to Access-Control-Allow-Origin: * — every site can read this API. Browsers refuse to send credentials to a wildcard, so this exposes unauthenticated responses only; it is a deliberate choice for a public API and a mistake for an internal one',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: "Pass the origins you actually serve: app.enableCors({ origin: ['https://app.example.com'] })",
        documentationLink: 'https://docs.nestjs.com/security/cors',
      }),
      wildcardOrigin: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS',
        cwe: 'CWE-942',
        owasp: 'A05:2021',
        cvss: 5.3,
        description:
          "origin: '*' lets every site read responses from this API. Browsers refuse to send credentials to a wildcard, so this exposes unauthenticated responses only — unlike origin: true, which stays valid with credentials",
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: "Replace the wildcard with an explicit allowlist: origin: ['https://app.example.com']",
        documentationLink: 'https://docs.nestjs.com/security/cors',
      }),
      reflectedOrigin: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Reflected CORS Origin',
        cwe: 'CWE-942',
        owasp: 'A05:2021',
        cvss: 8.1,
        description:
          'origin: true echoes the request Origin back, so every site passes — and unlike a wildcard it stays valid with credentials: true, letting any page read authenticated responses',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: "Replace with an explicit allowlist: origin: ['https://app.example.com']",
        documentationLink: 'https://cwe.mitre.org/data/definitions/942.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options;
    if (allowInTests && TEST_FILE.test(context.filename)) return {};

    /**
     * Whether the call sits inside a branch that tests the environment.
     *
     * Only the *condition* text is inspected, and only for an environment
     * marker — the rule does not try to evaluate which way the branch goes.
     */
    function insideEnvironmentBranch(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        let test: TSESTree.Node | null = null;
        if (current.type === AST_NODE_TYPES.IfStatement) test = current.test;
        else if (current.type === AST_NODE_TYPES.ConditionalExpression)
          test = current.test;
        else if (current.type === AST_NODE_TYPES.LogicalExpression)
          test = current.left;
        if (test) {
          const text = context.sourceCode.getText(test);
          if (ENV_HINT.test(text) && isDevelopmentScoped(text)) return true;
        }
        current = current.parent;
      }
      return false;
    }

    /** Report on the `origin` value when it accepts everything. */
    function checkOptionsObject(
      optionsNode: TSESTree.ObjectExpression,
      reportOn: TSESTree.Node,
    ): void {
      const originProp = findOriginProperty(optionsNode);
      if (!originProp) {
        // A spread could carry `origin` in from elsewhere — don't guess.
        if (hasSpread(optionsNode)) return;
        // Otherwise no origin is set, and the CORS default is '*'.
        context.report({ node: reportOn, messageId: 'defaultOrigin' });
        return;
      }
      const value = originProp.value;
      if (value.type === AST_NODE_TYPES.Literal) {
        if (value.value === '*') {
          context.report({ node: originProp, messageId: 'wildcardOrigin' });
        } else if (value.value === true) {
          context.report({ node: originProp, messageId: 'reflectedOrigin' });
        }
      }
      // Anything else (identifier, member expression, array, function, template)
      // is either a real allowlist or not statically knowable — stay quiet.
      //
      // `['*']` in particular is NOT a wildcard, however it reads. cors compares
      // each array element with `origin === allowedOrigin` (lib/index.js,
      // isOriginAllowed) and no browser sends `Origin: *`, so the list matches
      // nothing and the header is omitted — deny, not allow. The wildcard
      // shortcut in configureOrigin fires only for the top-level *string* '*'.
    }

    /**
     * `NestFactory.create(App, { cors })` — the same setting, elsewhere.
     *
     * Nest routes the constructor option straight into the method this rule
     * already watches:
     *
     *   const passCustomOptions = isObject(cors) || isFunction(cors);
     *   if (!passCustomOptions) return this.enableCors();
     *   return this.enableCors(this.appOptions.cors);
     *
     * So `{ cors: true }` *is* a bare `enableCors()`, and reporting one while
     * ignoring the other was an accident of which callee the visitor matched,
     * not a decision about risk.
     */
    /**
     * Whether the call is the framework implementing `enableCors`, not an
     * application calling it.
     *
     * `nest-framework/packages/core/nest-application.ts:130` is literally
     * `return this.enableCors();` inside NestJS's own implementation of the
     * API this rule watches — reporting it accuses the framework of the flaw
     * its own code is there to configure. An application always holds the app
     * in a binding (`app.enableCors()`); a `this` receiver means the class
     * *is* the application, which no consumer's bootstrap ever is.
     */
    function isSelfCall(callee: TSESTree.Node): boolean {
      return (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.ThisExpression
      );
    }

    function checkNestFactoryOptions(node: TSESTree.CallExpression): void {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
      if (expressionName(callee.object) !== 'NestFactory') return;
      const method = expressionName(callee);
      // createMicroservice has no HTTP surface and no cors option.
      if (method !== 'create' && method !== 'createApplicationContext') return;

      // The options object is always last, but not always second:
      // `NestFactory.create(AppModule, new FastifyAdapter(), { cors: true })`
      // is the documented Fastify spelling and puts it third. Reading
      // `arguments[1]` saw the adapter and gave up.
      const options = node.arguments.at(-1);
      if (node.arguments.length < 2) return;
      if (options?.type !== AST_NODE_TYPES.ObjectExpression) return;
      const props = objectProperties(options);
      // A spread could supply `cors`; cannot prove its absence or its shape.
      if (!props) return;

      const cors = props.get('cors');
      // No `cors` key at all means CORS is off — the secure default.
      if (!cors) return;

      if (cors.type === AST_NODE_TYPES.ObjectExpression) {
        checkOptionsObject(cors, cors);
        return;
      }
      // A non-object truthy value takes the bare-enableCors() path.
      if (cors.type === AST_NODE_TYPES.Literal && cors.value === true) {
        context.report({ node: cors, messageId: 'defaultOrigin' });
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // A permissive origin fenced behind a development check cannot reach
        // production. Applies to both entry points below.
        if (insideEnvironmentBranch(node)) return;
        checkNestFactoryOptions(node);
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        const property = node.callee.property;
        if (
          property.type !== AST_NODE_TYPES.Identifier ||
          property.name !== 'enableCors'
        )
          return;
        if (isSelfCall(node.callee)) return;

        const [arg] = node.arguments;

        // app.enableCors() — options omitted entirely.
        if (!arg) {
          context.report({ node, messageId: 'defaultOrigin' });
          return;
        }

        if (arg.type === AST_NODE_TYPES.ObjectExpression) {
          checkOptionsObject(arg, node);
          return;
        }

        // app.enableCors(corsOptions) — only when the object is declared in this
        // file. An imported config is not knowable here, so it is left alone.
        if (arg.type === AST_NODE_TYPES.Identifier) {
          const resolved = resolveLocalObject(
            context.sourceCode.getScope(node),
            arg.name,
          );
          if (resolved) checkOptionsObject(resolved, node);
        }
      },
    };
  },
});
