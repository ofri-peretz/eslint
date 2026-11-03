/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent PII (email, SSN, credit cards) in console logs
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/532.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  nameHasAnyWord,
  namesOneOf,
  memberPropertyName,
  propertyName,
  staticString,
  objectKeyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

export interface Options {
  /**
   * `console` methods treated as a log sink. REPLACES the built-in list.
   * Default: DEFAULT_CONSOLE_METHODS
   */
  consoleMethods?: string[];

  /** Extra `console` methods, ON TOP of the built-ins. Default: [] */
  additionalConsoleMethods?: string[];

  /**
   * Field vocabulary, matched as WHOLE WORDS of an identifier. REPLACES the
   * built-in list. Default: DEFAULT_PII_TERMS
   */
  piiTerms?: string[];

  /** Extra PII field terms, ON TOP of the built-ins. Default: [] */
  additionalPiiTerms?: string[];

  /**
   * String literals that are EXACTLY a field label announcing the next
   * argument. REPLACES the built-in list. Default: DEFAULT_PII_LABELS
   */
  piiLabels?: string[];

  /** Extra field labels, ON TOP of the built-ins. Default: [] */
  additionalPiiLabels?: string[];

  /**
   * Receiver names that denote an application logger; every level method on
   * one is a log sink. REPLACES the built-in list. Default: DEFAULT_LOGGERS
   */
  loggers?: string[];

  /** Extra logger receiver names, ON TOP of the built-ins. Default: [] */
  additionalLoggers?: string[];

  /**
   * Words naming a whole person record, matched as WHOLE WORDS of an
   * identifier. Serializing one (`JSON.stringify(user)`) logs every field it
   * holds. REPLACES the built-in list. Default: DEFAULT_PII_RECORDS
   */
  piiRecords?: string[];

  /** Extra person-record words, ON TOP of the built-ins. Default: [] */
  additionalPiiRecords?: string[];
}

type RuleOptions = [Options?];

/**
 * The `console` methods this rule treats as a log sink.
 *
 * Four of the twenty-odd methods `console` actually ships, chosen because they
 * are the ones that reach a log pipeline. `console.debug`, `console.trace` and
 * `console.table` leak exactly as much on a service that ships debug output —
 * a consumer who does can say so rather than accept the omission.
 */
const DEFAULT_CONSOLE_METHODS = ['log', 'error', 'warn', 'info'];

/**
 * Field vocabulary, matched as WHOLE WORDS of an identifier — never as a
 * substring.
 *
 * `phone` is a substring of `microphone`, `headphones`, `smartphone` and
 * `saxophone`; `password` is a substring of `passwordless`, which means the
 * opposite. The shipped rule used `propName.includes(p)` and reported
 * `console.log(device.microphoneEnabled)` as "PII in console logs" — a WebRTC
 * capability boolean. `nameHasAnyWord` splits the identifier into segments
 * first, so `microphoneEnabled` → ['microphone','enabled'] and no term matches.
 *
 * `credit card` is a two-word term: it matches the consecutive segments of
 * `creditCardNumber` and `credit_card_last4`, and not `wildcardPolicy`.
 *
 * Five terms is a deliberately small default — every additional word is a bet
 * that no consumer's domain uses it as an ordinary noun. The rest of the PII
 * surface (`dob`, `passport`, `iban`, `nationalId`, …) is reachable through
 * `additionalPiiTerms`, and a domain where one of the five is ordinary can drop
 * it through `piiTerms`. Whole-word matching is not negotiable either way.
 */
const DEFAULT_PII_TERMS = ['email', 'ssn', 'password', 'credit card', 'phone'];

/**
 * A string literal argument that is EXACTLY a field label, e.g.
 * `console.log('email:', value)` — the label announces that the next argument
 * is the address.
 *
 * Exact match, not `includes`. The shipped rule tested
 * `text.includes('email:')`, which reported UI copy such as
 * `console.error('Validation failed - email: must be a valid address')`: a
 * constant string naming a form field, with no personal data in the call at
 * all. A literal is a compile-time constant — it cannot hold a user's data —
 * so the only thing a literal can contribute is a label for a SIBLING value.
 */
const DEFAULT_PII_LABELS = [
  'email:',
  'ssn:',
  'password:',
  'credit card:',
  'creditcard:',
];

/**
 * Receiver names that denote an application logger.
 *
 * `logger.info(...)` is the doc's own first incorrect example, and it was
 * silent: only `console` was a sink. Matched on the receiver's own name — the
 * identifier, or the last property of `this.logger` — so a domain object
 * called `log` that is not a logger can be dropped through `loggers`.
 */
const DEFAULT_LOGGERS = ['logger', 'log'];

/**
 * The level methods a logger writes through.
 *
 * @protocol-constant The union of the level names pino, winston, bunyan,
 * log4js and NestJS's `Logger` publish. Consulted only once the receiver is a
 * logger, so it never judges a bare `info()` or `error()`. Unlike `console`,
 * every level of an application logger is configured to ship somewhere — the
 * level gates verbosity, not destination.
 */
const LOGGER_METHODS: ReadonlySet<string> = new Set([
  'trace',
  'debug',
  'verbose',
  'info',
  'log',
  'warn',
  'error',
  'fatal',
]);

/**
 * Words naming a whole person record. `JSON.stringify(user)` serializes every
 * field the record holds — its email and phone included — so the call leaks
 * what `user.email` leaks, concealed. Matched as whole words, so `userRecord`
 * is a user record by name and `username` (one word) is not.
 */
const DEFAULT_PII_RECORDS = [
  'user',
  'person',
  'customer',
  'account',
  'applicant',
  'patient',
];

/**
 * PII written as a literal, per the doc's detection table: an email address,
 * a US SSN, and a 13–19 digit card number that passes Luhn. A literal cannot
 * hold a USER's data, but a hard-coded address or card number is still
 * personal data landing in the log.
 */
const EMAIL_IN_TEXT =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const SSN_IN_TEXT = /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/;
const CARD_IN_TEXT = /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])/g;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Does this logged node's constant text carry an email, an SSN or a card number? */
function constantTextHasPii(node: TSESTree.Node): boolean {
  // `'a@b.co'` and `` `a@b.co` `` are the same constant string.
  const constant = staticString(node);
  let text: string;
  if (constant !== null) {
    text = constant;
  } else if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    text = node.quasis.map((quasi) => quasi.value.raw).join(' ');
  } else {
    return false;
  }
  if (EMAIL_IN_TEXT.test(text) || SSN_IN_TEXT.test(text)) return true;
  return [...text.matchAll(CARD_IN_TEXT)].some((match) =>
    passesLuhn(match[0].replace(/[ -]/g, '')),
  );
}

/** Unary operators whose result still carries the operand's value. */
const INVERTIBLE_UNARY: ReadonlySet<string> = new Set(['+', '-', '~']);

/**
 * Binary operators whose result still carries both operands' value.
 *
 * @protocol-constant JavaScript's arithmetic operators. They are the
 * language's, not a codebase's, so there is nothing for an option to extend.
 */
const VALUE_PRESERVING_BINARY: ReadonlySet<string> = new Set([
  '+',
  '-',
  '*',
  '/',
]);

/** `JSON.stringify(x)` — serializes `x` verbatim into the logged string. */
function stringifiedValue(node: TSESTree.Node): TSESTree.Node | null {
  if (
    node.type !== AST_NODE_TYPES.CallExpression ||
    node.callee.type !== AST_NODE_TYPES.MemberExpression ||
    node.callee.object.type !== AST_NODE_TYPES.Identifier ||
    node.callee.object.name !== 'JSON' ||
    propertyName(node.callee) !== 'stringify'
  ) {
    return null;
  }
  const [value] = node.arguments;
  return value === undefined || value.type === AST_NODE_TYPES.SpreadElement
    ? null
    : value;
}

/**
 * The sub-expressions that place a value VERBATIM into the logged output.
 *
 * Template interpolation, `+` concatenation, an object literal's property
 * values, a ternary's arms and a TypeScript cast all pass the value straight
 * through, so `console.log(`sent to ${user.email}`)` leaks exactly as much as
 * `console.log(user.email)`. The shipped rule inspected only arguments that
 * were THEMSELVES a MemberExpression and missed every one of those shapes.
 *
 * A CallExpression is deliberately NOT traversed. `hash(user.email)` logs a
 * digest, not the address — traversing into call arguments would report the
 * recommended remediation as the vulnerability. `JSON.stringify` is the one
 * exception: it serializes, it does not digest.
 */
function collectLoggedValues(root: TSESTree.Node): TSESTree.Node[] {
  const found: TSESTree.Node[] = [];
  const pending: TSESTree.Node[] = [root];

  while (pending.length > 0) {
    const node = pending.pop() as TSESTree.Node;
    found.push(node);

    if (node.type === AST_NODE_TYPES.TSAsExpression) {
      pending.push(node.expression);
    } else if (node.type === AST_NODE_TYPES.TemplateLiteral) {
      pending.push(...node.expressions);
    } else if (
      node.type === AST_NODE_TYPES.BinaryExpression &&
      VALUE_PRESERVING_BINARY.has(node.operator)
    ) {
      // `+` concatenation, and invertible arithmetic (`user.ssn * 1`,
      // `phone - 0`) that keeps every digit; a modulus or a shift does not.
      pending.push(node.left, node.right);
    } else if (node.type === AST_NODE_TYPES.ObjectExpression) {
      for (const property of node.properties) {
        if (property.type === AST_NODE_TYPES.Property) {
          pending.push(property.value);
        }
      }
    } else if (node.type === AST_NODE_TYPES.ConditionalExpression) {
      pending.push(node.consequent, node.alternate);
    } else if (
      node.type === AST_NODE_TYPES.UnaryExpression &&
      INVERTIBLE_UNARY.has(node.operator)
    ) {
      // `+user.phone` / `-x` / `~x` — a numeric conversion the value
      // survives intact; `!x`, `typeof x` and `void x` do not.
      pending.push(node.argument);
    } else {
      // `JSON.stringify(user.email)` is the one call that IS value-preserving:
      // it serializes its argument into the string, it does not digest it.
      const serialized = stringifiedValue(node);
      if (serialized !== null) pending.push(serialized);
    }
  }

  return found;
}

/** `user.email` / `account.holder.creditCardNumber` — a PII field read. */
function isPiiFieldAccess(
  node: TSESTree.Node,
  piiTerms: readonly string[],
): boolean {
  // `user['email']` reads the same field `user.email` does. Resolved once,
  // and the null case asked as its own question rather than cast into the
  // word test — a field the AST cannot name is not a field without PII in
  // its name, it is a field nothing here can judge.
  const field = memberPropertyName(node);
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    field !== null &&
    nameHasAnyWord(field, piiTerms)
  );
}

export const noPiiInLogs = createRule<RuleOptions, MessageIds>({
  name: 'no-pii-in-logs',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-pii-in-logs.md',
      description: 'Prevent PII (email, SSN, credit cards) in console logs',
      cwe: 'CWE-359',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'violation Detected',
        cwe: 'CWE-359',
        description:
          'Prevent PII (email, SSN, credit cards) in console logs detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          consoleMethods: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_CONSOLE_METHODS,
            description:
              '`console` methods treated as a log sink, matched as an exact method name. Replaces the built-in list.',
          },
          additionalConsoleMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra `console` methods, on top of `consoleMethods`.',
          },
          piiTerms: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PII_TERMS,
            description:
              'Field vocabulary, matched as WHOLE WORDS of an identifier — never as a substring. Multi-word terms such as "credit card" match consecutive segments. Replaces the built-in list.',
          },
          additionalPiiTerms: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra PII field terms, on top of `piiTerms`.',
          },
          piiLabels: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PII_LABELS,
            description:
              'String literals that are EXACTLY a field label announcing the next argument. Compared case-insensitively after trimming. Replaces the built-in list.',
          },
          additionalPiiLabels: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra field labels, on top of `piiLabels`.',
          },
          loggers: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_LOGGERS,
            description:
              'Receiver names that denote an application logger (`logger.info`, `this.logger.error`); every level method on one is a log sink. Replaces the built-in list.',
          },
          additionalLoggers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra logger receiver names, on top of `loggers`.',
          },
          piiRecords: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PII_RECORDS,
            description:
              'Words naming a whole person record, matched as WHOLE WORDS of an identifier. `JSON.stringify` of one is reported. Replaces the built-in list.',
          },
          additionalPiiRecords: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra person-record words, on top of `piiRecords`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      consoleMethods: DEFAULT_CONSOLE_METHODS,
      additionalConsoleMethods: [],
      piiTerms: DEFAULT_PII_TERMS,
      additionalPiiTerms: [],
      piiLabels: DEFAULT_PII_LABELS,
      additionalPiiLabels: [],
      loggers: DEFAULT_LOGGERS,
      additionalLoggers: [],
      piiRecords: DEFAULT_PII_RECORDS,
      additionalPiiRecords: [],
    },
  ],
  createOnce(context, currentOptions) {
    let logMethods: Set<string>;
    let terms: string[];
    let labels: Set<string>;
    // `string | null` so a runtime-keyed receiver's null name is simply absent.
    let loggerNames: Set<string | null>;
    let records: string[];
    let sourceCode: Readonly<TSESLint.SourceCode>;

    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'violationDetected',
      });
    }

    /**
     * One binding hop: `const { email } = applicant; console.log(email)`.
     *
     * This is the FALSE-NEGATIVE half of the same defect. The value logged is
     * identical, but the argument is a plain Identifier, so a rule that looks
     * only at the node in front of it sees nothing. Resolving the binding
     * recovers the evidence the destructuring pattern already carries — the
     * property it was read from — rather than guessing from the local name.
     */
    function isPiiBinding(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }

      const scope: TSESLint.Scope.Scope = sourceCode.getScope(node);
      const reference = scope.references.find((ref) => ref.identifier === node);
      const resolved = reference?.resolved;
      if (!resolved) {
        return false;
      }

      return resolved.defs.some((def) => {
        const declared = def.name as TSESTree.Node;
        // `{ email = '' }` puts a default between the binding and its property.
        const bound =
          declared.parent?.type === AST_NODE_TYPES.AssignmentPattern
            ? declared.parent
            : declared;
        const parent = bound.parent;

        // `const { email } = applicant` — the binding IS the property, and
        // `{ 'email': e }` names the same property.
        if (parent?.type === AST_NODE_TYPES.Property) {
          const key = objectKeyName(parent);
          return key !== null && nameHasAnyWord(key, terms);
        }

        // `const email = applicant.email` — the binding holds the field read.
        if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.init) {
          return isPiiFieldAccess(parent.init, terms);
        }

        return false;
      });
    }

    /**
     * `console.log(…)` with a configured console method, or any level method
     * of a logger receiver: `logger.info(…)`, `this.logger.error(…)`.
     */
    function isLogSink(callee: TSESTree.Expression): boolean {
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      // `console['log'](user.email)` writes the same line to the same
      // stream. A method chosen at runtime names no sink and is skipped.
      const method = propertyName(callee);
      const receiver = callee.object;
      if (receiver.type === AST_NODE_TYPES.Identifier) {
        return receiver.name === 'console'
          ? namesOneOf(method, logMethods)
          : loggerNames.has(receiver.name) &&
              namesOneOf(method, LOGGER_METHODS);
      }
      return (
        receiver.type === AST_NODE_TYPES.MemberExpression &&
        loggerNames.has(propertyName(receiver)) &&
        namesOneOf(method, LOGGER_METHODS)
      );
    }

    /** `JSON.stringify(user)` — a whole person record serialized into the line. */
    function isSerializedRecord(node: TSESTree.Node): boolean {
      const serialized = stringifiedValue(node);
      return (
        serialized?.type === AST_NODE_TYPES.Identifier &&
        nameHasAnyWord(serialized.name, records)
      );
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const {
          consoleMethods = DEFAULT_CONSOLE_METHODS,
          additionalConsoleMethods = [],
          piiTerms = DEFAULT_PII_TERMS,
          additionalPiiTerms = [],
          piiLabels = DEFAULT_PII_LABELS,
          additionalPiiLabels = [],
          loggers = DEFAULT_LOGGERS,
          additionalLoggers = [],
          piiRecords = DEFAULT_PII_RECORDS,
          additionalPiiRecords = [],
        } = options as Options;
        loggerNames = new Set([...loggers, ...additionalLoggers]);
        records = [...piiRecords, ...additionalPiiRecords];

        logMethods = new Set([...consoleMethods, ...additionalConsoleMethods]);
        terms = [...piiTerms, ...additionalPiiTerms];
        // Normalised the same way the literal being tested is, so a user writing
        // `'DOB:'` matches `console.log('dob: ', v)` exactly as the built-ins do.
        labels = new Set(
          [...piiLabels, ...additionalPiiLabels].map((label) =>
            label.trim().toLowerCase(),
          ),
        );

        sourceCode = context.sourceCode;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!isLogSink(node.callee)) {
          return;
        }

        for (const [index, arg] of node.arguments.entries()) {
          // A label only means something when there is a following argument
          // for it to label.
          if (
            arg.type === AST_NODE_TYPES.Literal &&
            typeof arg.value === 'string' &&
            index < node.arguments.length - 1 &&
            labels.has(arg.value.trim().toLowerCase())
          ) {
            report(node);
            return;
          }

          for (const value of collectLoggedValues(arg)) {
            if (
              isPiiFieldAccess(value, terms) ||
              isPiiBinding(value) ||
              isSerializedRecord(value) ||
              constantTextHasPii(value)
            ) {
              report(node);
              return;
            }
          }
        }
      },
    };
  },
});
