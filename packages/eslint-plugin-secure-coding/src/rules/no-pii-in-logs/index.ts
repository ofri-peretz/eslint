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
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

const CONSOLE_METHODS = new Set(['log', 'error', 'warn', 'info']);

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
 */
const PII_TERMS = ['email', 'ssn', 'password', 'credit card', 'phone'] as const;

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
const PII_LABELS = new Set(['email:', 'ssn:', 'password:', 'credit card:', 'creditcard:']);

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
    } else if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
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
function isPiiFieldAccess(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    nameHasAnyWord(node.property.name, PII_TERMS)
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
        description: 'Prevent PII (email, SSN, credit cards) in console logs detected - this is a security risk',
        severity: 'HIGH',
        fix: 'Review and apply secure practices',
        documentationLink: 'https://cwe.mitre.org/data/definitions/359.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
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
          return nameHasAnyWord(parent.key.name, PII_TERMS);
        }

        // `const email = applicant.email` — the binding holds the field read.
        if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.init) {
          return isPiiFieldAccess(parent.init);
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
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          !CONSOLE_METHODS.has(node.callee.property.name)
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
            PII_LABELS.has(arg.value.trim().toLowerCase())
          ) {
            report(node);
            return;
          }

          for (const value of collectLoggedValues(arg)) {
            if (isPiiFieldAccess(value) || isPiiBinding(value)) {
              report(node);
              return;
            }
          }
        }
      },
    };
  },
});
