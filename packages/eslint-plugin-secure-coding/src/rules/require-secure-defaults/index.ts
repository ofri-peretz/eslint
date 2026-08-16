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

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * Option keys whose ENTIRE documented API surface is a security switch, so the
 * key alone identifies the setting and `false` is the insecure value.
 *
 * Exact membership against a closed set of documented option names — never a
 * substring test. `httpOnly` and `requireTLS` exist on nothing but a cookie and
 * a mail transport respectively; `strictSSL` and `sslValidate` on nothing but a
 * TLS client.
 */
const FALSE_IS_INSECURE = new Set(['strictSSL', 'httpOnly', 'requireTLS', 'sslValidate']);

/**
 * The same idea inverted: keys where `true` is the value that ACCEPTS the
 * insecure thing. Measured gap — the corpus found five real insecure defaults
 * that are positive booleans, and a rule that only tested `=== false` could not
 * see any of them.
 */
const TRUE_IS_INSECURE = new Set([
  'tlsAllowInvalidCertificates',
  'tlsAllowInvalidHostnames',
  'allowInvalidCertificates',
  'ignoreHTTPSErrors',
]);

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

/** Attributes that exist on a cookie and nowhere else in a config object. */
const COOKIE_ATTRIBUTES = new Set([
  'httpOnly',
  'sameSite',
  'maxAge',
  'expires',
  'domain',
  'path',
  'signed',
  'partitioned',
  'priority',
]);

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
  if (node.key.type === AST_NODE_TYPES.Literal && typeof node.key.value === 'string') {
    return node.key.value;
  }
  return undefined;
};

/**
 * Does the object this property sits in prove it is describing a cookie?
 *
 * Structural only: sibling keys of the same object literal, or the key this
 * object is the value of. No identifier spelling is consulted.
 */
const hasCookieContext = (property: TSESTree.Property): boolean => {
  // A Property's parent is an ObjectExpression or an ObjectPattern, and both
  // carry `properties`. No guard: in a pattern the value is a binding, never
  // the literal `false`, so this is only ever reached from an object literal.
  const object = property.parent;

  for (const sibling of object.properties) {
    if (sibling === property) continue;
    if (sibling.type !== AST_NODE_TYPES.Property) continue;
    const siblingKey = propertyKey(sibling);
    if (siblingKey !== undefined && COOKIE_ATTRIBUTES.has(siblingKey)) return true;
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
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Property(node: TSESTree.Property) {
        const key = propertyKey(node);
        if (key === undefined) return;

        const insecure =
          (FALSE_IS_INSECURE.has(key) && isLiteral(node.value, false)) ||
          (TRUE_IS_INSECURE.has(key) && isLiteral(node.value, true)) ||
          (VERIFICATION_CALLBACKS.has(key) && isNoopCallback(node.value)) ||
          (CORROBORATION_REQUIRED.has(key) &&
            isLiteral(node.value, false) &&
            hasCookieContext(node));

        if (insecure) {
          context.report({ node, messageId: 'violationDetected' });
        }
      },
    };
  },
});
