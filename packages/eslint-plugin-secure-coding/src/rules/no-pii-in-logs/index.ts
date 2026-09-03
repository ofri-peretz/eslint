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
 * recommended remediation as the vulnerability.
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
      node.operator === '+'
    ) {
      pending.push(node.left, node.right);
    } else if (node.type === AST_NODE_TYPES.ObjectExpression) {
      for (const property of node.properties) {
        if (property.type === AST_NODE_TYPES.Property) {
          pending.push(property.value);
        }
      }
    } else if (node.type === AST_NODE_TYPES.ConditionalExpression) {
      pending.push(node.consequent, node.alternate);
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
    },
  ],
  create(context, [options = {}]) {
    const {
      consoleMethods = DEFAULT_CONSOLE_METHODS,
      additionalConsoleMethods = [],
      piiTerms = DEFAULT_PII_TERMS,
      additionalPiiTerms = [],
      piiLabels = DEFAULT_PII_LABELS,
      additionalPiiLabels = [],
    } = options as Options;

    const logMethods = new Set([
      ...consoleMethods,
      ...additionalConsoleMethods,
    ]);
    const terms = [...piiTerms, ...additionalPiiTerms];
    // Normalised the same way the literal being tested is, so a user writing
    // `'DOB:'` matches `console.log('dob: ', v)` exactly as the built-ins do.
    const labels = new Set(
      [...piiLabels, ...additionalPiiLabels].map((label) =>
        label.trim().toLowerCase(),
      ),
    );

    const sourceCode = context.sourceCode;

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
        const parent = declared.parent;

        // `const { email } = applicant` — the binding IS the property.
        if (
          parent?.type === AST_NODE_TYPES.Property &&
          parent.key.type === AST_NODE_TYPES.Identifier
        ) {
          return nameHasAnyWord(parent.key.name, terms);
        }

        // `const email = applicant.email` — the binding holds the field read.
        if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.init) {
          return isPiiFieldAccess(parent.init, terms);
        }

        return false;
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.object.type !== AST_NODE_TYPES.Identifier ||
          node.callee.object.name !== 'console' ||
          // `console['log'](user.email)` writes the same line to the same
          // stream. A method chosen at runtime names no sink and is skipped.
          !namesOneOf(propertyName(node.callee), logMethods)
        ) {
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
            if (isPiiFieldAccess(value, terms) || isPiiBinding(value)) {
              report(node);
              return;
            }
          }
        }
      },
    };
  },
});
