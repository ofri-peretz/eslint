/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-cors-check
 * Detects missing CORS validation (wildcard CORS, missing origin check)
 * CWE-346: Origin Validation Error
 *
 * @see https://cwe.mitre.org/data/definitions/346.html
 * @see https://owasp.org/www-community/attacks/CORS_Misconfiguration
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  propertyName,
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  holdsRequestOrigin,
  isCorsPackageCall,
} from '../../utils/cors-middleware';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds = 'missingCorsCheck';

export interface Options {
  /** Allow missing CORS checks in test files. Default: false */
  allowInTests?: boolean;

  /** Trusted CORS libraries. Default: ['cors', '@koa/cors', 'express-cors'] */
  trustedLibraries?: string[];

  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * What is wrong with this literal `origin` value — or `null` if nothing is?
 *
 * `origin: true` was pinned as VALID by this rule's own fixture, next to an
 * `origin: "*"` case it reported. That ordering is backwards. In the `cors`
 * package, `true` means "reflect whatever Origin header the request carried",
 * which is a wildcard that ALSO works with credentials — browsers refuse to
 * send credentials to a literal `*`, but they will happily send them to a
 * reflected origin. So `origin: true` is strictly more dangerous than the `*`
 * the rule already caught, and it was the shape being called safe.
 *
 * @see https://github.com/expressjs/cors#configuration-options
 */
function describePermissiveOrigin(value: unknown): string | null {
  if (value === '*') {
    return 'Wildcard CORS origin (*) allows all origins';
  }
  if (value === true) {
    return 'origin: true reflects the request Origin header, allowing every origin — and unlike "*" it still works with credentials';
  }
  return null;
}

/**
 * Is `node` inside a branch that decided something first — an `if`, a
 * ternary or a short-circuit — before its enclosing function ends?
 *
 * `if (allowed.includes(origin)) res.setHeader('…-Origin', origin)` is the
 * allowlist this rule asks for; the reflection is only unchecked when nothing
 * guards it.
 */
function isGuarded(node: TSESTree.Node): boolean {
  // `Program.parent` is NULL, not undefined — a strict check for one of the
  // two crashed the lint run on a module-scope header write.
  for (
    let current: TSESTree.Node | null | undefined = node.parent;
    current != null;
    current = current.parent
  ) {
    // Node kinds, not words: the grammar's three branching forms and its three
    // function forms. A switch over the AST's own discriminant, so the
    // compiler checks every name against the node union.
    switch (current.type) {
      case AST_NODE_TYPES.IfStatement:
      case AST_NODE_TYPES.ConditionalExpression:
      case AST_NODE_TYPES.LogicalExpression:
        return true;
      // A check outside the handler runs once, when it is installed, not per
      // request: it guards nothing the handler does.
      case AST_NODE_TYPES.FunctionDeclaration:
      case AST_NODE_TYPES.FunctionExpression:
      case AST_NODE_TYPES.ArrowFunctionExpression:
        return false;
    }
  }
  return false;
}

/** The options keys that carry the allowed origin. Compared lower-cased. */
const ORIGIN_KEYS: ReadonlySet<string> = new Set(['origin', 'allowedorigins']);

const ALLOW_ORIGIN = 'access-control-allow-origin';

const VALIDATE_ORIGIN =
  'Use origin validation: app.use(cors({ origin: (origin, callback) => { if (allowedOrigins.includes(origin)) callback(null, true); else callback(new Error("Not allowed")); } } }));';

const VALIDATE_HEADER =
  'Validate origin before setting header: res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes(origin) ? origin : "null");';

/** Does any of the user's ignore patterns match this source text? */
function matchesIgnorePattern(text: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return false;
    }
  });
}

export const noMissingCorsCheck = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-cors-check',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/no-permissive-cors'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-missing-cors-check.md',
      description:
        'Detects missing CORS validation (wildcard CORS, missing origin check)',
      cwe: 'CWE-346',
      cvss: 7.5,
    },
    messages: {
      missingCorsCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CORS Validation',
        cwe: 'CWE-346',
        description: 'Missing CORS validation detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/346.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing CORS checks in test files',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Custom CORS libraries to trust (wildcard origins in these libraries will not be reported)',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional safe patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedLibraries: [],
      ignorePatterns: [],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let trustedLibraries: string[];
    let ignorePatterns: string[];
    let sourceCode: Readonly<TSESLint.SourceCode>;

    function ignored(node: TSESTree.Node): boolean {
      return matchesIgnorePattern(sourceCode.getText(node), ignorePatterns);
    }

    /** Is the factory's callee one of the libraries the user trusts? */
    function isTrusted(call: TSESTree.CallExpression): boolean {
      const callee = sourceCode.getText(call.callee).toLowerCase();
      return trustedLibraries.some((lib) => callee.includes(lib.toLowerCase()));
    }

    /**
     * `cors({ origin: '*' })`, `cors({ origin: true })` and the same options
     * bound to a `const` first, on the `cors` package recognised by its import
     * (a global `cors` in a snippet counts; a `cors` from another module does
     * not). Only the origin keys: `methods: '*'` beside a validated origin is
     * not an origin finding.
     */
    function checkWildcardOrigin(call: TSESTree.CallExpression) {
      if (!isCorsPackageCall(call, sourceCode) || isTrusted(call)) return;
      if (ignored(call)) return;
      const report = (value: unknown, node: TSESTree.Node): void => {
        const issue = describePermissiveOrigin(value);
        if (issue === null) return;
        context.report({
          node,
          messageId: 'missingCorsCheck',
          data: { issue, safeAlternative: VALIDATE_ORIGIN },
        });
      };
      for (const arg of call.arguments) {
        // `cors('*')` hands the wildcard over as the whole argument.
        if (arg.type === 'Literal') {
          report(arg.value, arg);
          continue;
        }
        const options =
          arg.type === 'Identifier' ? resolveInitializer(arg, sourceCode) : arg;
        if (options?.type !== 'ObjectExpression') continue;
        for (const prop of options.properties) {
          if (prop.type !== 'Property') continue;
          // `{ ['origin']: '*' }` names the same option, and a key chosen at
          // runtime (`{ [k]: '*' }`) may be it.
          const key = objectKeyName(prop)?.toLowerCase();
          if (key !== undefined && !ORIGIN_KEYS.has(key)) continue;
          if (prop.value.type !== 'Literal') continue;
          // An inline option is reported where it is written; a bound one
          // where the binding is handed to the factory.
          report(prop.value.value, options === arg ? prop.value : arg);
        }
      }
    }

    /**
     * `cors()` and `cors({ credentials: true })` — CORS middleware with NO
     * origin option, which the `cors` package defaults to `*`. The documented
     * "missing origin validation" case; only the explicit wildcard was caught.
     *
     * Not silenced by `trustedLibraries`, which the docs scope to wildcard
     * origins. An options object held in a variable is not judged here.
     */
    function checkMissingOrigin(node: TSESTree.CallExpression) {
      if (!isCorsPackageCall(node, sourceCode)) return;
      const options = node.arguments[0];
      // Missing only when EVERY key is readable and none is an origin key.
      // A spread or a runtime key may supply `origin`, and `allowedOrigins` is
      // the other origin key this rule reads.
      const missing =
        options === undefined ||
        (options.type === 'ObjectExpression' &&
          options.properties.every((prop) => {
            if (prop.type !== 'Property') return false;
            const key = objectKeyName(prop)?.toLowerCase();
            return key !== undefined && !ORIGIN_KEYS.has(key);
          }));
      if (!missing || ignored(node)) return;
      context.report({
        node,
        messageId: 'missingCorsCheck',
        data: {
          issue:
            'CORS middleware without an origin option allows every origin (the cors default is *)',
          safeAlternative: VALIDATE_ORIGIN,
        },
      });
    }

    /**
     * `res.setHeader('Access-Control-Allow-Origin', '*')` /
     * `res.header(…)` / `res['setHeader'](…)`, and the same header set to the
     * request's own Origin with no check in front of it.
     */
    function checkHeader(call: TSESTree.CallExpression) {
      if (call.callee.type !== 'MemberExpression') return;
      const method = propertyName(call.callee);
      if (method !== 'setHeader' && method !== 'header') return;
      const [name, value] = call.arguments;
      if (value === undefined) return;
      if (staticString(name)?.toLowerCase() !== ALLOW_ORIGIN) return;
      if (ignored(call)) return;
      // Reflecting the request's Origin header with no check in front of it
      // is a wildcard that also carries credentials.
      if (holdsRequestOrigin(value, sourceCode) && !isGuarded(call)) {
        context.report({
          node: value,
          messageId: 'missingCorsCheck',
          data: {
            issue:
              'Reflecting the request Origin header unchecked allows every origin',
            safeAlternative: VALIDATE_HEADER,
          },
        });
      }
      if (staticString(value) === '*') {
        context.report({
          node: value,
          messageId: 'missingCorsCheck',
          data: {
            issue: 'Wildcard CORS header allows all origins',
            safeAlternative: VALIDATE_HEADER,
          },
        });
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        // The merged `defaultOptions` supply every field.
        const { allowInTests } = options as Required<Options>;
        ({ trustedLibraries, ignorePatterns } = options as Required<Options>);
        sourceCode = context.sourceCode;
        return !(allowInTests && isTestFilePath(context.filename));
      },
      CallExpression(node: TSESTree.CallExpression) {
        checkMissingOrigin(node);
        checkWildcardOrigin(node);
        checkHeader(node);
      },
    };
  },
});
