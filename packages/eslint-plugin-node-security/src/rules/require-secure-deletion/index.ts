/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require secure data deletion patterns
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/459.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  identifierWords,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { resolveConstantString } from '../../utils/const-value';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * Extra sensitive property names, on top of the built-in list.
   *
   * Matched as whole words at the END of the property name, exactly like the
   * built-ins — see `isSensitiveName`. Write them the way you would say them:
   * `'pin code'`, `'pin_code'` and `'pinCode'` all match a property called
   * `pinCode`; `'pincode'` does not, because it is one word and the property is
   * two. Default: []
   */
  additionalSensitiveProperties?: string[];

  /**
   * REPLACE the built-in list rather than adding to it. Default: unset.
   *
   * `additionalSensitiveProperties` can only grow the vocabulary, which leaves
   * a project no way to remove a word we guessed wrong about — a codebase whose
   * `keyMap` is a keyboard map, or whose `token` is a lexer token, could add
   * forever and never stop the report.
   *
   * The rule matches on a NAME by necessity: the value at a `delete` site is
   * not available to a syntactic rule. That makes the vocabulary a claim about
   * somebody else's naming, and a claim about somebody else's naming has to be
   * theirs to withdraw.
   */
  sensitiveProperties?: readonly string[];
}

type RuleOptions = [Options?];

/**
 * Property names that mark a value as a secret whose lifetime matters.
 *
 * `delete` unbinds a property; it does not scrub the string, and every other
 * reference (a spread copy, a log line, an already-serialised response body)
 * keeps the value alive. That is the CWE-459 "incomplete cleanup" this rule is
 * about — and it only means anything when the property actually held a secret.
 *
 * Matching is on the property NAME, deliberately: the value at a `delete` site
 * is not available to a syntactic rule, so the name is the only signal there
 * is. What bounds the cost of that is `isSensitiveName` below, not the length
 * of this list.
 *
 * The list is written as head nouns and as the compounds whose head is too
 * generic to list alone (`key` matches `keyboard`, `keyCode`, `objectKey`), so
 * `secret key` and `private key` are spelled out while `token` is not — the
 * head-final match already covers `refreshToken`, `accessToken`, `userToken`.
 */
const SENSITIVE_PROPERTY_NAMES = [
  'password', 'passwd', 'pwd', 'passphrase',
  'secret', 'token', 'jwt', 'bearer', 'credential',
  'api key', 'secret key', 'private key', 'signing key', 'encryption key', 'access key',
  'session id', 'ssn', 'credit card', 'card number', 'cvv',
];

/**
 * Is this property name a credential — as opposed to something ABOUT one?
 *
 * The old test was `name.toLowerCase().includes(fragment)`, and the corpus
 * showed what that costs on ordinary code:
 *
 *   usage.totalTokens          an LLM usage COUNT
 *   parser.tokenizerState      a lexer's scratch state
 *   parser.tokenBuffer         a buffer of lexical tokens
 *   options.secretsManagerArn  a POINTER to a secret, not a secret
 *   tls.privateKeyPath         a FILENAME, readable in any process listing
 *
 * All five were reported at MEDIUM as leaked credentials. Whole-word matching
 * alone fixes only two of them (`secrets` and `tokenizer` stop matching); the
 * other three still contain the word.
 *
 * The invariant that separates them is grammatical, not lexical: English
 * compound nouns are head-final. `refreshToken` IS a token; `tokenBuffer` is a
 * buffer. `privateKeyPath` is a path. So the credential phrase must END the
 * identifier — it has to be the thing the property IS, not a modifier on
 * something else. That is one rule rather than a growing list of exceptions,
 * and it costs recall only on names like `passwordHash`, which is the
 * suppressing direction and the cheap one.
 */
function isSensitiveName(name: string, phrases: readonly string[]): boolean {
  const words = identifierWords(name);
  if (words.length === 0) return false;
  return phrases.some((phrase) => {
    const needle = identifierWords(phrase);
    if (needle.length === 0 || needle.length > words.length) return false;
    const start = words.length - needle.length;
    return needle.every((word, offset) => words[start + offset] === word);
  });
}

export const requireSecureDeletion = createRule<RuleOptions, MessageIds>({
  name: 'require-secure-deletion',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/require-secure-deletion.md',
      description: 'Require secure data deletion patterns',
      cwe: 'CWE-459',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Incomplete Secret Cleanup',
        cwe: 'CWE-459',
        description: '`delete` on the sensitive property `{{property}}` unbinds it without scrubbing the value',
        severity: 'MEDIUM',
        fix: 'Overwrite the value before deleting it (obj.{{property}} = undefined, or zero-fill the Buffer), and make sure no copy of the object was spread, logged, or serialised first',
        documentationLink: 'https://cwe.mitre.org/data/definitions/459.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitiveProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [...SENSITIVE_PROPERTY_NAMES],
            description:
              'Replace the built-in sensitive-property vocabulary. Takes precedence over additionalSensitiveProperties.',
          },
          additionalSensitiveProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra sensitive property names, matched as whole words at the END of the name. "pin code", "pin_code" and "pinCode" all match a property called pinCode; "pincode" does not.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      additionalSensitiveProperties: [],
      // The built-in vocabulary, stated rather than implied by a `??` fallback.
      sensitiveProperties: [...SENSITIVE_PROPERTY_NAMES],
    },
  ],
  create(context, [options = {}]) {
    // The default lives in `defaultOptions`, so there is no `??` fallback to
    // take here — a second copy of the default is a second thing to keep in
    // step, and coverage proved this one was never reached.
    const {
      additionalSensitiveProperties = [],
      sensitiveProperties = SENSITIVE_PROPERTY_NAMES,
    } = options as Options;

    const phrases = [...sensitiveProperties, ...additionalSensitiveProperties];

    /** The property name being deleted, or undefined if it isn't statically known. */
    function deletedPropertyName(node: TSESTree.Node): string | undefined {
      // `delete obj?.password` wraps the member expression in a ChainExpression.
      const argument = node.type === AST_NODE_TYPES.ChainExpression ? node.expression : node;
      if (argument.type !== AST_NODE_TYPES.MemberExpression) return undefined;
      const property = argument.property;
      if (!argument.computed && property.type === AST_NODE_TYPES.Identifier) return property.name;
      // `const SECRET_FIELD = 'password'; delete user[SECRET_FIELD]`. A
      // redaction helper that keeps its field list in one place is better code
      // than the inline version, and reading only the property node made it
      // invisible. `resolveConstantString` is `const`-and-one-hop only, so an
      // unresolvable key still abstains.
      const resolved = resolveConstantString(context.sourceCode, property);
      return resolved?.value;
    }

    function reportIfSensitive(node: TSESTree.Node, property: string | undefined): void {
      // Only a `delete` of a *named, statically known, sensitive* property is
      // reportable. Firing on every `delete obj.prop` produced 120 findings
      // on a 1,470-file corpus with no security content whatsoever — the rule
      // was a `delete` detector, not a secret-cleanup detector.
      if (!property) return;
      if (!isSensitiveName(property, phrases)) return;
      context.report({ node, messageId: 'violationDetected', data: { property } });
    }

    return {
      UnaryExpression(node: TSESTree.UnaryExpression) {
        if (node.operator !== 'delete') return;
        reportIfSensitive(node, deletedPropertyName(node.argument));
      },

      /**
       * `Reflect.deleteProperty(record, 'password')` — the delete operator as a
       * function, which is what proxy traps and generic serialisers call. It
       * scrubs exactly as little as `delete` and formed no UnaryExpression, so
       * the rule could not see it at all.
       */
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.object.type !== AST_NODE_TYPES.Identifier ||
          callee.object.name !== 'Reflect' ||
          // `Reflect['deleteProperty'](rec, 'refresh_token')` deletes the same
          // key, and leaves the same value recoverable in memory.
          propertyName(callee) !== 'deleteProperty'
        ) {
          return;
        }
        const key = node.arguments[1];
        if (!key) return;
        reportIfSensitive(node, resolveConstantString(context.sourceCode, key)?.value);
      },
    };
  },
});
