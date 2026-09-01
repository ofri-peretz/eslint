/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Ensure secure default configurations
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/453.html
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons, staticString } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * Option keys whose `false` value is the insecure one. REPLACES the built-in
   * list. Default: DEFAULT_INSECURE_WHEN_FALSE
   */
  insecureWhenFalse?: string[];

  /** Extra keys where `false` is insecure, ON TOP of the built-ins. Default: [] */
  additionalInsecureWhenFalse?: string[];

  /**
   * Option keys whose `true` value ACCEPTS the insecure thing. REPLACES the
   * built-in list. Default: DEFAULT_INSECURE_WHEN_TRUE
   */
  insecureWhenTrue?: string[];

  /** Extra keys where `true` is insecure, ON TOP of the built-ins. Default: [] */
  additionalInsecureWhenTrue?: string[];

  /**
   * Keys that exist on a cookie and nowhere else, used only as corroborating
   * structure for `secure: false`. REPLACES the built-in list.
   * Default: DEFAULT_COOKIE_ATTRIBUTES
   */
  cookieAttributes?: string[];

  /** Extra cookie attribute names, ON TOP of the built-ins. Default: [] */
  additionalCookieAttributes?: string[];
}

type RuleOptions = [Options?];

/**
 * Option keys whose ENTIRE documented API surface is a security switch, so the
 * key alone identifies the setting and `false` is the insecure value.
 *
 * Exact membership against a closed set of documented option names — never a
 * substring test. `httpOnly` and `requireTLS` exist on nothing but a cookie and
 * a mail transport respectively; `strictSSL` and `sslValidate` on nothing but a
 * TLS client.
 *
 * These are library option names, not a protocol: every HTTP/TLS/mail client in
 * the ecosystem spells its own switch differently, and the list can never be
 * complete. So it is the DEFAULT of `insecureWhenFalse`, extensible through
 * `additionalInsecureWhenFalse`, rather than a fact the consumer must accept.
 */
const DEFAULT_INSECURE_WHEN_FALSE = ['strictSSL', 'httpOnly', 'requireTLS', 'sslValidate'];

/**
 * The same idea inverted: keys where `true` is the value that ACCEPTS the
 * insecure thing. Measured gap — the corpus found five real insecure defaults
 * that are positive booleans, and a rule that only tested `=== false` could not
 * see any of them.
 */
const DEFAULT_INSECURE_WHEN_TRUE = [
  'tlsAllowInvalidCertificates',
  'tlsAllowInvalidHostnames',
  'allowInvalidCertificates',
  'ignoreHTTPSErrors',
];

/**
 * `secure: false` is NOT evidence of an insecure default on its own, and this
 * is the rule's single largest measured false positive.
 *
 * In nodemailer `secure: false` is the DOCUMENTED, CORRECT setting for the
 * submission port 587: it means "open in cleartext, then upgrade via STARTTLS".
 * `secure: true` there does not harden the transport, it breaks it. Component
 * libraries use a `secure` boolean for unrelated affordances. Only as a cookie
 * attribute does `secure: false` mean "send this over plain HTTP".
 *
 * So `secure` reports only with corroborating structure from the SAME object:
 * a sibling that exists on nothing but a cookie, or an object that is itself
 * the value of a `cookie` option. Never the spelling of a variable or a callee.
 */
const CORROBORATION_REQUIRED = new Set(['secure']);

/**
 * Attributes that exist on a cookie and nowhere else in a config object.
 *
 * Not a closed protocol set, which is why it is configurable: RFC 6265 defines
 * six of these, `sameSite` and `partitioned` come from later drafts, and
 * `signed` is Express's, not the wire format's at all. A consumer whose cookie
 * serialiser spells one differently gets no corroboration and no finding.
 */
const DEFAULT_COOKIE_ATTRIBUTES = [
  'httpOnly',
  'sameSite',
  'maxAge',
  'expires',
  'domain',
  'path',
  'signed',
  'partitioned',
  'priority',
];

/** The option keys under which a cookie's own attribute bag is nested. */
const COOKIE_CONTAINER_KEYS = new Set(['cookie', 'cookies']);

/** Keys whose value must be a real verification callback to mean anything. */
const VERIFICATION_CALLBACKS = new Set(['checkServerIdentity']);

/**
 * A return value that cannot express "verification failed".
 *
 * Node calls `checkServerIdentity` and treats ANY non-Error return as success,
 * so a callback that can only produce `undefined`, `null` or `true` has
 * disabled hostname verification while leaving `rejectUnauthorized` true — the
 * shape that reads as hardened in review.
 */
const isBenignReturnValue = (node: TSESTree.Node): boolean =>
  (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined') ||
  (node.type === AST_NODE_TYPES.Literal && (node.value === null || node.value === true));

const isNoopCallback = (node: TSESTree.Node): boolean => {
  if (
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    node.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return false;
  }

  // `() => undefined`, `() => true` — a concise body that is already the answer.
  if (node.body.type !== AST_NODE_TYPES.BlockStatement) return isBenignReturnValue(node.body);

  // `() => {}` / `function () {}`
  if (node.body.body.length === 0) return true;

  const [only] = node.body.body;
  if (node.body.body.length !== 1 || only?.type !== AST_NODE_TYPES.ReturnStatement) return false;

  // `{ return; }` and `{ return true; }` are both unconditional success.
  return only.argument === null || isBenignReturnValue(only.argument);
};

/**
 * The statically knowable name of a property key.
 *
 * `{ secure: false }` and `{ 'secure': false }` are the same configuration, so
 * both are read; a computed key is not knowable and makes the rule abstain.
 */
const propertyKey = (node: TSESTree.Property): string | undefined => {
  if (node.computed) return undefined;
  if (node.key.type === AST_NODE_TYPES.Identifier) return node.key.name;
  const staticText = staticString(node.key);
  if (staticText !== null) {
    return staticText;
  }
  return undefined;
};

/**
 * Does the object this property sits in prove it is describing a cookie?
 *
 * Structural only: sibling keys of the same object literal, or the key this
 * object is the value of. No identifier spelling is consulted.
 */
const hasCookieContext = (
  property: TSESTree.Property,
  cookieAttributes: ReadonlySet<string>,
): boolean => {
  // A Property's parent is an ObjectExpression or an ObjectPattern, and both
  // carry `properties`. No guard: in a pattern the value is a binding, never
  // the literal `false`, so this is only ever reached from an object literal.
  const object = property.parent;

  for (const sibling of object.properties) {
    if (sibling === property) continue;
    if (sibling.type !== AST_NODE_TYPES.Property) continue;
    const siblingKey = propertyKey(sibling);
    if (siblingKey !== undefined && cookieAttributes.has(siblingKey)) return true;
  }

  const owner = object.parent;
  if (owner.type !== AST_NODE_TYPES.Property) return false;
  const ownerKey = propertyKey(owner);
  return ownerKey !== undefined && COOKIE_CONTAINER_KEYS.has(ownerKey);
};

const isLiteral = (node: TSESTree.Node, value: boolean): boolean =>
  node.type === AST_NODE_TYPES.Literal && node.value === value;

export const requireSecureDefaults = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-defaults',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/require-secure-defaults.md',
      description: 'Ensure secure default configurations',
      cwe: 'CWE-1188',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-1188',
        description: 'Ensure secure default configurations detected - Insecure default values',
        severity: 'MEDIUM',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/1188.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          insecureWhenFalse: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_INSECURE_WHEN_FALSE,
            description:
              'Config keys whose `false` value is the insecure one. Replaces the built-in list; matched as an exact key name, never a substring.',
          },
          additionalInsecureWhenFalse: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra keys where `false` is insecure, on top of `insecureWhenFalse`.',
          },
          insecureWhenTrue: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_INSECURE_WHEN_TRUE,
            description:
              'Config keys whose `true` value accepts the insecure thing. Replaces the built-in list.',
          },
          additionalInsecureWhenTrue: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra keys where `true` is insecure, on top of `insecureWhenTrue`.',
          },
          cookieAttributes: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_COOKIE_ATTRIBUTES,
            description:
              'Keys that exist on a cookie and nowhere else. Used only as corroborating structure for `secure: false`. Replaces the built-in list.',
          },
          additionalCookieAttributes: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra cookie attribute names, on top of `cookieAttributes`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      insecureWhenFalse: DEFAULT_INSECURE_WHEN_FALSE,
      additionalInsecureWhenFalse: [],
      insecureWhenTrue: DEFAULT_INSECURE_WHEN_TRUE,
      additionalInsecureWhenTrue: [],
      cookieAttributes: DEFAULT_COOKIE_ATTRIBUTES,
      additionalCookieAttributes: [],
    },
  ],
  create(context, [options = {}]) {
    const {
      insecureWhenFalse = DEFAULT_INSECURE_WHEN_FALSE,
      additionalInsecureWhenFalse = [],
      insecureWhenTrue = DEFAULT_INSECURE_WHEN_TRUE,
      additionalInsecureWhenTrue = [],
      cookieAttributes = DEFAULT_COOKIE_ATTRIBUTES,
      additionalCookieAttributes = [],
    } = options as Options;

    // Exact membership, as before — the option changes WHICH names are watched,
    // never HOW they are matched. A configurable substring test would be the
    // defect this rule's key sets exist to avoid.
    const falseIsInsecure = new Set([...insecureWhenFalse, ...additionalInsecureWhenFalse]);
    const trueIsInsecure = new Set([...insecureWhenTrue, ...additionalInsecureWhenTrue]);
    const cookieKeys = new Set([...cookieAttributes, ...additionalCookieAttributes]);

    return {
      Property(node: TSESTree.Property) {
        const key = propertyKey(node);
        if (key === undefined) return;

        const insecure =
          (falseIsInsecure.has(key) && isLiteral(node.value, false)) ||
          (trueIsInsecure.has(key) && isLiteral(node.value, true)) ||
          (VERIFICATION_CALLBACKS.has(key) && isNoopCallback(node.value)) ||
          (CORROBORATION_REQUIRED.has(key) &&
            isLiteral(node.value, false) &&
            hasCookieContext(node, cookieKeys));

        if (insecure) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
